#!/usr/bin/env sh
SELEKT_CLIENT_DIR=$(pwd)/client
SELEKT_SERVER_DIR=$(pwd)/server
SCRIPTS_DIR=$(pwd)/scripts

if [ ! -d $SCRIPTS_DIR ] ||
    [ ! -d $SELEKT_CLIENT_DIR ] ||
    [ ! -d $SELEKT_SERVER_DIR ]; then
    echo This script must be executed from the selekt project directory
    exit 1
fi

# Install node modules per package-lock.json
yarn
(cd $SELEKT_CLIENT_DIR && yarn)
(cd $SELEKT_SERVER_DIR && yarn)

# Build front-end
(cd $SELEKT_CLIENT_DIR && yarn build)

# Copy front-end build to server directory
rm -rf ${SELEKT_SERVER_DIR}/public
mkdir ${SELEKT_SERVER_DIR}/public
cp -r ${SELEKT_CLIENT_DIR}/build/* ${SELEKT_SERVER_DIR}/public

# Build test deb for test cases and to use during dev
node ${SELEKT_SERVER_DIR}/generate-test-db-fixture.js