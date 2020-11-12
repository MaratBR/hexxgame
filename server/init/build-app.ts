import http from "http"
import socketio from "socket.io"
import Application from "koa"
import createApp, {IAppParams} from "./app";
import createSocketIOFromHTTPServer from "../socketio";
import {SESSION_CONFIG} from "./session";
import {mongoose} from "@typegoose/typegoose";
import config from "../config";
import {initAuth} from "../auth";
import c from "koa-session/lib/context";
import sharedSession from "../socketio/sharedSession";

interface BuiltApp {
    server: http.Server
    socketIO?: socketio.Server
    koa?: Application
    port?: number
    host?: string

    run(): void
    stop(): void
}

interface IAppBuilderConfig {
    port?: number
    host?: string
}

export default class AppBuilder {
    private _enableSocketIO: boolean = true
    private _cfg: IAppBuilderConfig = {
        port: 8000,
        host: '0.0.0.0'
    }
    private _appCfg?: IAppParams

    disableSocketIO(): this {
        this._enableSocketIO = false
        return this
    }

    port(v: number): this {
        this._cfg.port = v
        return this
    }

    withAppBuildConfig(cfg: IAppParams): this {
        this._appCfg = cfg
        return this
    }

    build(): BuiltApp {
        const app = createApp()
        let sio: socketio.Server | undefined
        const server = app ? http.createServer(app.callback()) : http.createServer()

        if (app) {
            initAuth(app)
        }

        if (this._enableSocketIO)
            sio = createSocketIOFromHTTPServer(server, s => {
                s.use(sharedSession(app));
            })

        mongoose.connect(config.db.uri, { useNewUrlParser: true, useUnifiedTopology: true })
            .catch(console.error)

        return {
            server,
            koa: app,
            socketIO: sio,
            port: this._cfg.port,
            host: this._cfg.host,
            run() {
                server.listen(this.port, this.host || 'localhost')
                const address = server.address()
                console.log(`👉 Server listening on ${this.host}:${this.port}`)
            },
            stop() {
                server.close()
            }
        }
    }
}
