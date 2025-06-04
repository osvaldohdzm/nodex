#!/bin/bash
rm -rf node_modules

docker-compose down --remove-orphans
# Optional: Prune system to remove build cache (be careful if you have other important unused images/cache)
# docker system prune -a --volumes 
#docker-compose build --no-cache frontend
#docker-compose up -d frontend
#docker-compose logs -f frontend

docker-compose up -d --build --force-recreate 

