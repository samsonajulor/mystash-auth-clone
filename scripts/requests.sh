#!/usr/bin/env bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <username>"
    exit 1
fi

username=$1
submodule_url="https://github.com/mystash-ng/mystash-requests.git"

echo $submodule_url

git pull

if [ -d "requests" ]; then
git submodule update --remote requests
fi

git submodule add --force $submodule_url requests

cd requests
git submodule init
git submodule update
cd ..

git add requests
git commit -m "Added submodule $submodule_url"
