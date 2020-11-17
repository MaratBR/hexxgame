import "reflect-metadata"
import http from "http"
import initServer from "./initServer";
import redisAdapter from "socketio.io-redis"
import {REDIS_CLIENT, REDIS_CLIENT2} from "../init/redis";
import SIO, {Server} from "socket.io";
import config from "../../config";


export default function createSocketIOFromHTTPServer(server: http.Server, init?: (server: Server) => void) {
    const io = new SIO.Server(server, {
        cors: {
            origin: config.cors.origin
        }
    })

    io.adapter(redisAdapter({
        pubClient: REDIS_CLIENT,
        subClient: REDIS_CLIENT2
    }))

    if (init)
        init(io)

    initServer(io)

    return io
}