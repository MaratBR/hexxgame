import "reflect-metadata"

import http from "http"
import initServer from "./initServer";
import redisAdapter from "socket.io-redis"
import {REDIS_CLIENT} from "../init/redis";
import {Server} from "socket.io";
import Application from "koa";

export default function createSocketIOFromHTTPServer(server: http.Server) {
    const io = new Server(server)

    io.adapter(redisAdapter({
        pubClient: REDIS_CLIENT,
        subClient: REDIS_CLIENT
    }))
    return io
}
