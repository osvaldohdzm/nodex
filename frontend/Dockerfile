FROM node:16

WORKDIR /app

COPY package.json package.json
# Added a comment to force Docker to rebuild the npm install layer
RUN npm install

COPY . .

CMD ["npm", "start"]

