#!/bin/bash
cd ./stacygaudreau.com
hugo
npm run build
cd ..
firebase deploy