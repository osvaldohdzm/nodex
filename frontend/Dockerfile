FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.json ./
COPY eslint.config.mjs ./

RUN npm install --verbose

EXPOSE 3000

CMD ["npm", "start"]

