FROM mhart/alpine-node:14.15 AS builder

WORKDIR /usr/src/app

COPY nginx.conf ./
COPY package.json ./
COPY tsconfig.json ./
COPY workspaces workspaces
COPY yarn.lock ./

RUN yarn install
RUN yarn --cwd ./workspaces/common build
RUN yarn --cwd ./workspaces/server build
RUN yarn --cwd ./workspaces/client build

FROM mhart/alpine-node:14.15 as server
WORKDIR /root/
COPY --from=builder /usr/src/app/workspaces/server/dist ./workspaces/server/dist
COPY --from=builder /usr/src/app/workspaces/server/package.json ./workspaces/server/package.json
COPY --from=builder /usr/src/app/workspaces/common/package.json ./workspaces/common/package.json
COPY --from=builder /usr/src/app/workspaces/common/dist ./workspaces/common/dist
COPY --from=builder /usr/src/app/package.json ./
RUN ["yarn", "install", "--production"]
EXPOSE 8080
ENTRYPOINT ["node", "workspaces/server/dist/server.js"]

FROM nginx:1.15 AS client
WORKDIR /var/www/hexx
COPY --from=builder /usr/src/app/workspaces/client/build ./build
COPY --from=builder /usr/src/app/nginx.conf /etc/nginx/conf.d/default.conf
RUN pwd
RUN ls
RUN ls ./build
