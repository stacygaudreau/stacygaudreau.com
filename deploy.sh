#!/bin/bash

# ----------------------------------- Setup ---------------------------------- #
set -euf -o pipefail

# ---------------------------- Deploy to Firebase ---------------------------- #
cd ./stacygaudreau.com
hugo
npm run build
cd ..
firebase deploy