FROM mhart/alpine-node:14.15 AS builder

WORKDIR /usr/src/app

COPY nginx.conf ./
COPY package.json ./
COPY tsconfig.json ./
COPY workspaces workspaces
COPY yarn.lock ./

RUN yarn install
ENV REACT_APP_API_ADDRESS="http://api.hexx.burnaev.space"
RUN yarn --cwd ./workspaces/common build
RUN yarn --cwd ./workspaces/server build
RUN yarn --cwd ./workspaces/client build

FROM mhart/alpine-node:14.15 as server
WORKDIR /root/
COPY --from=builder /usr/src/app/workspaces/server/dist ./workspaces/server/dist
COPY --from=builder /usr/src/app/workspaces/server/package.json ./workspaces/server/package.json
COPY --from=builder /usr/src/app/workspaces/server/.env ./.env
COPY --from=builder /usr/src/app/workspaces/common/package.json ./workspaces/common/package.json
COPY --from=builder /usr/src/app/workspaces/common/dist ./workspaces/common/dist
COPY --from=builder /usr/src/app/package.json ./
RUN ["yarn", "install", "--production"]
ENV REDIS_IP=redis
ENV MONGODB_URI="mongodb://db:27017/hexx"
ENV OAUTH_REDIRECT_URL="http://hexx.burnaev.space/oauth?modal=1"
ENV CORS="http://hexx.burnaev.space"
ENV HOST=server
ENTRYPOINT ["node", "workspaces/server/dist/server.js"]

FROM nginx:1.15 AS client
WORKDIR /var/www/hexx
COPY --from=builder /usr/src/app/workspaces/client/build ./build
COPY --from=builder /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf
RUN pwd
RUN ls
RUN ls ./build
