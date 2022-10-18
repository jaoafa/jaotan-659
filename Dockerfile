FROM node:19-alpine

WORKDIR /app

COPY package.json /app/
COPY yarn.lock /app/
RUN yarn

ADD ./ /app

CMD yarn dev