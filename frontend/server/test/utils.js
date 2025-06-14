import assert from 'assert';
import { v4 as uuidv4 } from 'uuid';
import { rimrafSync } from 'rimraf';
import { mkdirp } from 'mkdirp';
import path from 'path';
import redis from 'redis';
import request from 'supertest';
import detectPort from 'detect-port';
import bodyParser from 'body-parser';
import express from 'express';
import http from 'http';
import Config from '../lib/config/index.js';
import { Sequelize } from 'sequelize';
import appLog from '../lib/app-log.js';
import * as db from '../lib/db.js';
import makeApp from '../app.js';
import makeMigrator from '../lib/make-migrator.js';
import loadSeedData from '../lib/load-seed-data.js';
import ensureConnectionAccess from '../lib/ensure-connection-access.js';
import ensureAdmin from '../lib/ensure-admin.js';
import serverDirname from '../server-dirname.cjs';

// At the start of any test run, clean out the root artifacts directory
before(function () {
  rimrafSync(path.join(serverDirname, 'test/artifacts/*'), { glob: true });
});

class TestUtils {
  constructor(args = {}) {
    const config = new Config(
      {
        // Despite being in-memory, still need a file path for cache and session files
        // Eventually these will be moved to sqlite and we can be fully-in-memory
        dbPath: path.join(serverDirname, 'test/artifacts/defaultdb'),
        dbInMemory: true,
        sessionStore: 'memory',
        queryResultStore: 'memory',
        appLogLevel: 'error',
        backendDatabaseUri: TestUtils.randomize_dbname(
          process.env.SELEKT_BACKEND_DB_URI
        ),
        webLogLevel: 'error',
        authProxyEnabled: true,
        authProxyHeaders: 'email:X-WEBAUTH-EMAIL',
        ...args,
      },
      {}
    );

    // TODO - this is problematic because multiple TestUtils are created all at once in describe()
    // and last one wins. This modifies a global state,
    // so there is no way for this to be enabled just for 1 test and not another
    appLog.setLevel(config.get('appLogLevel'));

    this.config = config;
    this.appLog = appLog;
    this.instanceAlias = uuidv4();
    this.sequelizeDb = undefined;
    this.app = undefined;
    this.models = undefined;

    this.users = {
      admin: {
        id: undefined, // set if created
        email: 'admin@test.com',
        role: 'admin',
      },
      editor: {
        id: undefined, // set if created
        email: 'editor@test.com',
        role: 'editor',
      },
      editor2: {
        id: undefined, // set if created
        email: 'editor2@test.com',
        role: 'editor',
      },
    };
  }

  static redisAvailable(redisUri) {
    return new Promise((resolve) => {
      const client = redis.createClient({ url: redisUri });
      client
        .connect()
        .then(() => {
          resolve(true);
          client.quit();
        })
        .catch(() => {
          resolve(false);
          client.quit();
        });
    });
  }

  static async makeHookServer() {
    const responses = [];
    const port = await detectPort(4000);
    const app = express();
    app.use(bodyParser.json());
    app.post('/', function (req, res) {
      responses.push({
        headers: {
          'selekt-secret': req.get('selekt-secret'),
          'selekt-url': req.get('selekt-url'),
          'selekt-hook-name': req.get('selekt-hook-name'),
        },
        body: req.body,
      });
      res.json({});
    });

    const server = http.createServer(app).listen(port);
    return {
      server,
      url: `http://localhost:${port}/`,
      responses,
      close: () => {
        return new Promise((resolve) => {
          server.closeAllConnections();
          server.close();
          resolve();
        });
      },
    };
  }

  static randomize_dbname(uri) {
    if (!uri) return '';
    const salt = uuidv4().replace(/-/g, '');
    const u = new URL(uri);
    u.pathname += salt;
    return u.href;
  }

  prepDbDir() {
    const dbPath = this.config.get('dbPath');
    mkdirp.sync(dbPath);
    return rimrafSync(path.join(dbPath, '*'), { glob: true });
  }

  async initDbs() {
    // Create DB if needed
    const backendDatabaseUri = this.config.get('backendDatabaseUri') || '';
    if (backendDatabaseUri) {
      const dbname = new URL(backendDatabaseUri).pathname.replace('/', '');
      const serverUri = backendDatabaseUri.replace(`/${dbname}`, '');
      const sequelize = new Sequelize(serverUri, {
        logging: (message) => appLog.debug(message),
      });
      try {
        await sequelize.query(`CREATE DATABASE ${dbname};`);
      } catch (e) {
        if (e.parent.message.includes('database exists')) {
          // ignore
        } else {
          throw e;
        }
      }
    }

    db.makeDb(this.config, this.instanceAlias);
    const { models, sequelizeDb } = await db.getDb(this.instanceAlias);
    this.models = models;
    this.sequelizeDb = sequelizeDb;

    this.migrator = makeMigrator(
      this.config,
      this.appLog,
      this.sequelizeDb.sequelize
    );
  }

  async migrate() {
    await this.migrator.migrate();
  }

  static validateErrorBody(body) {
    assert(body.title, 'Error response has title');
  }

  static validateListSuccessBody(body) {
    assert(Array.isArray(body), 'Body is an array');
  }

  async loadSeedData() {
    await loadSeedData(this.appLog, this.config, this.models);
  }

  async addUserApiHelper(key, user) {
    const newUser = await this.models.users.create(user);
    // If user already exists, update the id, otherwise add new one (using the original data)
    if (this.users[key]) {
      this.users[key].id = newUser.id;
    } else {
      // We must use original user object passed in as it has the password. the response from .save() does not
      this.users[key] = { ...user, id: newUser.id };
    }
    return newUser;
  }

  async init(withUsers) {
    await this.prepDbDir();
    await this.initDbs();
    await this.migrate();
    await ensureAdmin(this.models, this.config);
    await this.loadSeedData();
    await ensureConnectionAccess(this.sequelizeDb, this.config);

    this.app = await makeApp(this.config, this.models);

    assert.throws(() => {
      db.makeDb(this.config, this.instanceAlias);
    }, 'ensure db can be made once');

    if (withUsers) {
      for (const key of Object.keys(this.users)) {
        // eslint-disable-next-line no-await-in-loop
        await this.addUserApiHelper(key, this.users[key]);
      }
    }
  }

  async del(userKey, url, statusCode = 200) {
    const req = request(this.app).delete(url);
    if (this.users[userKey]) {
      req.set('X-WEBAUTH-EMAIL', this.users[userKey].email);
    }
    const response = await req.expect(statusCode);
    return response.body;
  }

  async get(userKey, url, statusCode = 200) {
    const req = request(this.app).get(url);
    if (this.users[userKey]) {
      req.set('X-WEBAUTH-EMAIL', this.users[userKey].email);
    }
    const response = await req.expect(statusCode);
    return response.body;
  }

  async getResponse(userKey, url, statusCode = 200) {
    const req = request(this.app).get(url);
    if (this.users[userKey]) {
      req.set('X-WEBAUTH-EMAIL', this.users[userKey].email);
    }
    return req.expect(statusCode);
  }

  async post(userKey, url, body, statusCode = 200) {
    const req = request(this.app).post(url);
    if (this.users[userKey]) {
      req.set('X-WEBAUTH-EMAIL', this.users[userKey].email);
    }
    const response = await req.send(body).expect(statusCode);
    return response.body;
  }

  async put(userKey, url, body, statusCode = 200) {
    const req = request(this.app).put(url);
    if (this.users[userKey]) {
      req.set('X-WEBAUTH-EMAIL', this.users[userKey].email);
    }
    const response = await req.send(body).expect(statusCode);
    return response.body;
  }
}

export default TestUtils;
