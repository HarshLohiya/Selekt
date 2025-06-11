---
title: Getting Started
description: Getting Started
layout: ../../layouts/MainLayout.astro
---

## Running selekt

### Building from source

selekt does not require any additional servers other than its own self. By default it uses SQLite and the file system for storing queries, query results, and web sessions. SQLite may be replaced with an external database. See [backend database configuration](/en/configuration?id=backend-database-management#backend-database-management) for more info.

[Build and run selekt from the git repository](https://github.com/selekt/selekt/blob/master/DEVELOPER-GUIDE.md)

### Docker

[Docker images](https://hub.docker.com/r/selekt/selekt/)

The docker image runs on port 3000 by default and stores its local database files at `/var/lib/selekt`. See [docker-examples](https://github.com/selekt/selekt/tree/master/docker-examples) directory for example docker-compose setup with SQL Server and others.

## Releases & Versioning

For selekt versions 6 and prior, the version strategy was inspired by [semantic versioning](https://semver.org/). Major version bumps contained breaking HTTP API changes, breaking configuration changes, removal of functionality, or major UI design changes. Minor and patch version bumps consisted of enhancements and bugfixes.

As of version 7, selekt will be dropping any attempt at following sementic versioning.

The `latest` tag on Docker Hub is continuously built from latest commit from the `master` branch in GitHub. Do not use it unless you are okay experiencing a work-in-progress. It should be functional, but may not be stable or final.

## Updating selekt

To update selekt:

1. Shut down existing selekt instance(s)
1. Take a backup of [backing database](/en/configuration?id=backend-database-management#backend-database-management)
1. Start updated selekt code or docker image

selekt runs its own migrations at application start, ensuring the schema is up-to-date.

## Database Migrations

!> When running multiple instances of selekt against a single backing database, auto migrate could cause race conditions

Migrations are run at application start by default, ensuring your selekt database schema is always up-to-date with the required version.

This can be disabled and migrations can instead be run as needed if preferred. To disable automigration, set `SELEKT_DB_AUTOMIGRATE` to `false`. To run migrations manually, provide cli flag `--migrate` when running `server.js` or set `SELEKT_MIGRATE` to `true`. When flagged, the process will run migrations and exit on completion.

If automigration is disabled and selekt detects migrations that have not run, selekt will exit with a non-zero exit code on start up.

If running multiple instances of selekt against a single backing database, be sure to adjust migration strategy accordingly. Multiple instances of selekt starting at once will likely cause a race condition at migration time. A few approaches to avoid this:

- Start one instance of selekt, and delay starting others until the first accepts HTTP connections
- Run migrations using `SELEKT_MIGRATE` or `--migrate`, and start selekt instances once finished

## Terminology

### Connections

A `Connection` in selekt is a configuration to a specific database instance. Other BI software may call these "data sources". A connection may involve a connection string, user credentials, host, port, etc. The data required by a connection depends on the database driver it uses to connect to the target database.

When a user write's a query, they'll pick a connection to use to run it. This connection choice will also be saved with the query.

Admins can create connections in the UI, but connections can also be created in a JSON or INI config file, via a complicated environment variable convention, or via experimental seed data files.

### Driver

selekt connections use various drivers to connect to a target database. Prior to the addition of ODBC support, selekt required a wrapping each database driver separately, as each implementation was slightly different. In selekt there is a Postgres driver and a MySQL driver. There is also an ODBC driver, _which requires its own additional drivers_ to be able to connect to the target database.

### Query

A `Query` in selekt terms is a SQL document, generally containing a single SELECT statement. It may contain multiple statements, but your mileage will vary depending on the database driver in use. Some driver implementations handle this, others don't.

### User

selekt has its own database of users that are allowed to access the system. These user records are stored and maintained regardless of authentication strategy used. Today the primary use of the user record is to track a user's permissions via the role they are assigned, and provide an identifier queries and connection access can be tied to.

## User Management

selekt users are one of two roles today: `Admin` and `Editor`.

`Admin` users administrators of the system, and generally can do anything that is possible in the system. Connection access restrictions and query sharing do not apply to them, and they can see everything. Admins are the only users allowed to create connections via the UI, assign connection access, and add new users.

`Editor` users are basic users that can create, run, and edit queries. As of version `4.2.0` all queries created are private to the user that created them, unless the user shares the query with other users on the platform. Editors cannot create their own connections or add users to the selekt instance.
