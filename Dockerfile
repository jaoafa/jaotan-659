FROM node:18-alpine

WORKDIR /app

COPY package.json /app/
COPY yarn.lock /app/
RUN yarn

ADD ./ /app

CMD yarn dev