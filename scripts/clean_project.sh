#!/bin/bash


cd frontend || exit 1

npm cache clean --force
rm -rf node_modules package-lock.json
npm install


echo "Limpieza de proyecto completada."

cd ..
