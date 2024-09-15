#!/usr/bin/env bash
submodule_url="https://github.com/mystash-ng/mystash-database.git"

echo $submodule_url

git pull

if [ -d "modules" ]; then
git submodule update --remote modules
fi

git submodule add --force $submodule_url modules

cd modules
git submodule init
git submodule update
cd ..

git add modules
