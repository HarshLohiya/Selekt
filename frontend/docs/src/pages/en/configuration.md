---
title: Configuration
description: Configuration
layout: ../../layouts/MainLayout.astro
---

selekt may be configured via environment variables or an .env config file.

Config file path may be specified passing command line option `--config` or environment variable `SELEKT_CONFIG`.
For example:

```bash
node server.js --config path/to/.env
# or
env SELEKT_CONFIG=path/to/.env node server.js
```

A [config file example](https://github.com/selekt/selekt/blob/master/config-example.env) can be found in the GitHub repository.

## Application Configuration (General)

```bash
# IP address to bind to. By default selekt will listen from all available addresses (0.0.0.0).
SELEKT_IP = "0.0.0.0"

# Port to listen on. Used for both HTTP and HTTPS.
# Defaults to 80 in code, 3000 in Docker Hub Image
SELEKT_PORT = 3000

# Public URL used for various authentication setups. Protocol is expected.
# This value will be sent with webhook payloads as well.
# Example: https://myselekt.com
PUBLIC_URL = ""

# Path to mount selekt app following domain.
# Example:
# If SELEKT_BASE_URL = "/selekt" and PUBLIC_URL = "https://myselekt.com",
# the queries page would be `https://myselekt.com/selekt/queries`
SELEKT_BASE_URL = ""

# Passphrase to encrypt sensitive connection information (like user & password) when stored in backing database.
SELEKT_PASSPHRASE = "At least the sensitive bits won't be plain text?"

# HTTP server timeout as number of seconds.
SELEKT_TIMEOUT_SECONDS = 300

# HTTP server maximum payload size.
# Defaults to `1mb`
# Uses bytes.js syntax (https://github.com/visionmedia/bytes.js#bytesparsestringnumber-value-numbernull)
# If no unit is given it is assumed the value is in bytes
# Useful valid units are `kb`, `mb` in base 2 (1mb = 1024kb)
SELEKT_BODY_LIMIT = "1mb"

# Minutes to keep a session active. Session will be extended by this amount each request.
SELEKT_SESSION_MINUTES = 60

# Store to use for user session
# Valid values are `file` (default), `database`, `redis`, `memory`
# `file` uses files in the sessions directory under SELEKT_DB_PATH
# `memory` may be used for single selekt instances, and works well for no-auth setups
# `redis` offers best performance and is most commonly used. SELEKT_REDIS_URI must also be set.
# `database` will use whatever backend database is used (or SQLite if SELEKT_DB_PATH is set)
SELEKT_SESSION_STORE = "file"

# The the SameSite restriction for the Session cookie
# You may need to switch this to 'Lax' for proper login routing in browsers e.g. oidc does not work in firefox with 'strict'.
# any login routing dependent on redirects requires 'Lax' to work for more info read https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
SELEKT_SESSION_COOKIE_SAME_SITE = 'strict'

# Similar to session storage, query result storage may also be configured.
# Valid values are `file` (default), `database`, `redis`, `memory`
# If set to `memory`, store is limited to 1000 entries with a max age of 1 hour
# Other storage mechanisms fall back to SELEKT_QUERY_HISTORY_RETENTION_PERIOD_IN_DAYS
# If `redis` is used, SELEKT_REDIS_URI must also be set.
SELEKT_QUERY_RESULT_STORE = "file"

# Name used for cookie. If running multiple selekts on same domain, set to different values.
SELEKT_COOKIE_NAME = "selekt.sid"

# Secret used to sign cookies
SELEKT_COOKIE_SECRET = "secret-used-to-sign-cookies-please-set-and-make-strong"

# Set secure cookie attribute
SELEKT_COOKIE_SECURE = "false"

# Acquire socket from systemd if available
SELEKT_SYSTEMD_SOCKET = ""

# Allows pre-approval of email domains for variety of authentication mechanisms.
# Delimit multiple domains by empty space.
SELEKT_ALLOWED_DOMAINS = ""

# Path to root of seed data directories. See Seed Data documentation.
SELEKT_SEED_DATA_PATH = ""

# Trust proxy
# https://expressjs.com/en/guide/behind-proxies.html
SELEKT_TRUST_PROXY = "false"
```

## Application Behavior

```bash
# Enable word wrapping in SQL editor
SELEKT_EDITOR_WORD_WRAP = "false"

# By default query results are limited to 10,000 records
SELEKT_QUERY_RESULT_MAX_ROWS = 10000

# Enable csv, json and xlsx downloads
SELEKT_ALLOW_CSV_DOWNLOAD = "true"

# Allows access on every connection to every user.
SELEKT_ALLOW_CONNECTION_ACCESS_TO_EVERYONE = "true"

# Query history entries created before the retention period will be deleted automatically.
SELEKT_QUERY_HISTORY_RETENTION_PERIOD_IN_DAYS = 30

# By default query history results are limited to 1,000 records.
SELEKT_QUERY_HISTORY_RESULT_MAX_ROWS = 1000

# Default connection to select on selekt load if connection not previously selected.
# Once selected, connection selections are cached locally in the browser.
SELEKT_DEFAULT_CONNECTION_ID = ""
```

## Redis

```bash
# URI for redis instance to use when SELEKT_SESSION_STORE or SELEKT_QUERY_RESULT_STORE are set to `redis`
# Format should be [redis[s]:]//[[user][:password@]][host][:port][/db-number][?db=db-number[&password=bar[&option=value]]]
# More info at http://www.iana.org/assignments/uri-schemes/prov/redis
SELEKT_REDIS_URI = ""
```

## Backend Database Management

selekt may be configured to use SQLite, PostgreSQL, MySQL, MariaDB, or SQL Server as a backing database.

To use SQLite, all that must be set is `SELEKT_DB_PATH`, and a `sqlite` file will be created on application start. In the official docker image, this path is set to `/var/lib/selekt`.

To use a different backend database, set `SELEKT_BACKEND_DB_URI` to the desired target database.

```bash
# Directory to store selekt disk-backed resources.
# Depending on configuration this could include SQLite file, query result cache files, and session storage.
# In the official docker image, this path is set to `/var/lib/selekt`.
SELEKT_DB_PATH = ""

# You can specify an external database to be used instead of the local sqlite database,
# by specifying a [Sequelize](https://sequelize.org/v5/) connection string.
# Supported databases are: mysql, mariadb, sqlite3, mssql.
# Some options can be provided in the connection string.
# Example: `mariadb://username:password@host:port/databasename?ssl=true`
SELEKT_BACKEND_DB_URI = ""

# If enabled, runs SQLite in memory
# In this case, the database contents will be lost when the application stops.
# SELEKT_DB_PATH is still required if SELEKT_SESSION_STORE or SELEKT_QUERY_RESULT_STORE are set to file.
SELEKT_DB_IN_MEMORY = "false"
```

## Database Migrations

By default, migrations are run on service start up. This behavior can be disabled, and migrations can instead be run on demand. This is particularly of use when running multiple instances of selekt.

When run on demand, the selekt process will exit after migrations complete.

This option is most likely useful as a cli flag, but it can be specified via environment variable as well.

Example:

```bash
node server.js --config path/to/file.ext --migrate
# or via environment variable
env SELEKT_MIGRATE = "true" node server.js --config path/to/file.env
```

```bash
# If set to true, selekt process will exit after database migration is performed
SELEKT_MIGRATE = "false"

# Enable/disable automigration on selekt process start. Disable by setting to `false`
SELEKT_DB_AUTOMIGRATE = "true"
```

## Service Tokens

Secret to sign the generated Service Tokens.

To generate a service token, log into selekt as an `admin` user and click `Service Tokens`. A service token can be scoped to a certain role (admin or editor) and limited to a window of time.

The generated Bearer token may be used by passing it via the Authorization header:

```bash
curl -X GET -H 'Accept: application/json' -H "Authorization: Bearer the.generated.token" http://localhost:3010/api/users
```

For more information on APIs available see [API Overview](/en/api-overview).

```bash
# Secret to sign the generated Service Tokens
SELEKT_SERVICE_TOKEN_SECRET = ""
```

## Logging

Minimum level for logs. Should be one of `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`. App logs contain log messages taken by application (running queries, creating users, general errors, etc.) while web logs are used for logging web requests made and related information, like time taken to serve them.

```bash
SELEKT_APP_LOG_LEVEL = 'info'
SELEKT_WEB_LOG_LEVEL = 'info
```

See [logging](/en/logging) for log examples.

## HTTPS

HTTPS may be configured to be used by selekt directly. However if performance becomes an issue, consider [using a reverse proxy](https://github.com/goldbergyoni/nodebestpractices/blob/master/sections/production/delegatetoproxy.md).

```bash
# Absolute path to where SSL certificate is stored
SELEKT_HTTPS_CERT_PATH = ""
# Absolute path to where SSL certificate key is stored
SELEKT_HTTPS_KEY_PATH = ""
# Passphrase for your SSL certification file
SELEKT_HTTPS_CERT_PASSPHRASE = ""
```

## Authentication

See [Authentication page](/en/authentication) for information on configuring authentication mechanisms.

## React App Build Configuration

The React build of the selekt client directory can be customized via .env files or build-time process environment variables.

```bash
# React App API/SPA Base URL Override
# By default, the client-side selekt React app expects to be able to call GET api/app to get the baseUrl of the API.  This could be a problem if there is a proxy or API gateway munging URL paths between users' browsers and the selekt API server.
# If you're building the React app yourself and hosting the single-page app's index.html at a different URL path from the API, you can set these environment variables at build time to specify the base URL paths of the front-end static content versus API.
# For example, with the following settings, the React app will expect the API to be hosted behind the same domain, but under the /api/selekt path; the index.html will be served from /ui; and all single-page app routing will retain /ui as the root path.
VITE_API_BASE_URL_OVERRIDE='/api/selekt'
VITE_SPA_BASE_URL_OVERRIDE='/ui'
```
