#!/usr/bin/env sh

# This script can be used for pushing patches not based on master branch
# In most cases use scripts/version.sh to do builds, not this one

# Determine if branch is up-to-date
# If not exit the script
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})

if [ $LOCAL = $REMOTE ]; then
    echo "Branch up-to-date"
else
    echo "Branch out of date"
    exit 1;
fi

# Get relevant directories and ensure script is executed from root of directory
SELEKT_ROOT_DIR=$(pwd)
SELEKT_CLIENT_DIR=$(pwd)/client
SELEKT_SERVER_DIR=$(pwd)/server
SCRIPTS_DIR=$(pwd)/scripts

if [ ! -d $SCRIPTS_DIR ] || \
   [ ! -d $SELEKT_CLIENT_DIR ] || \
   [ ! -d $SELEKT_SERVER_DIR ]
then
    echo This script must be executed from the selekt project directory
    exit 1
fi

VERSION=$1

cd $SELEKT_CLIENT_DIR
npm --no-git-tag-version version $VERSION || exit 1

cd $SELEKT_SERVER_DIR
npm --no-git-tag-version version $VERSION || exit 1

cd $SELEKT_ROOT_DIR
npm --no-git-tag-version version $VERSION || exit 1

git commit -a -m "v$VERSION" || exit 1

git tag -a "v$VERSION" -m "v$VERSION" || exit 1

git push origin HEAD
git push origin "v$VERSION"
