import assert from 'assert';
import testUtils from '../test-utils.js';
import postgres from './index.js';

const connection = {
  name: 'test postgres',
  driver: 'postgres',
  host: 'localhost',
  database: 'selekt',
  username: 'selekt',
  password: 'selekt',
  maxRows: 100,
};

describe('drivers/postgres', function () {
  // I'm unable to use the test.sh script that stands up the docker-compose prior to running tests
  // Instead I'm running postgres, and running mocha directly
  // which means the table created for testing needs to be cleared out each run, but won't exist the first time
  before(async function () {
    await postgres.runQuery('DROP TABLE IF EXISTS SELEKT_test;', connection);
    await postgres.runQuery(
      'CREATE TABLE SELEKT_test (id INT, name TEXT);',
      connection
    );
  });

  it('tests connection', function () {
    return postgres.testConnection(connection);
  });

  it('getSchema()', function () {
    return postgres.getSchema(connection).then((schemaInfo) => {
      testUtils.hasColumnDataType(
        schemaInfo,
        'public',
        'SELEKT_test',
        'id',
        'int4'
      );
    });
  });

  it('runQuery under limit', function () {
    return postgres
      .runQuery('SELECT * FROM generate_series(1, 10) gs;', connection)
      .then((results) => {
        assert(!results.incomplete, 'not incomplete');
        assert.equal(results.rows.length, 10, 'row length');
      });
  });

  it('runQuery over limit', function () {
    return postgres
      .runQuery('SELECT * FROM generate_series(1, 9000) gs;', connection)
      .then((results) => {
        assert(results.incomplete, 'incomplete');
        assert.equal(results.rows.length, 100, 'row length');
      });
  });

  it('Client cannot connect more than once', async function () {
    const client = new postgres.Client(connection);
    await client.connect();
    await assert.rejects(client.connect());
    await client.disconnect();
  });

  it('Client handles multiple disconnects', async function () {
    const client = new postgres.Client(connection);
    await client.connect();
    await client.disconnect();
    await client.disconnect();
  });

  it('Client handles multiple runQuery calls', async function () {
    const client = new postgres.Client(connection);
    await client.connect();

    const results1 = await client.runQuery(
      'SELECT * FROM generate_series(1, 10) g1'
    );
    assert.equal(results1.incomplete, false);
    assert.equal(results1.rows.length, 10);
    const results2 = await client.runQuery(
      'SELECT * FROM generate_series(1, 10) g1'
    );
    assert.equal(results2.incomplete, false);
    assert.equal(results2.rows.length, 10);

    await client.disconnect();
  });

  it('Throws helpful error', async function () {
    let error;
    try {
      await postgres.runQuery('SELECT * FROM fake_table', connection);
    } catch (e) {
      error = e;
    }
    assert(error);
    assert(
      error.message.includes('fake_table'),
      'Error message has table reference'
    );
  });
});
