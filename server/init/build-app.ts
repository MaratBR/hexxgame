import http from "http"
import socketio from "socket.io"
import Application from "koa"
import createApp from "./app";
import createSocketIOFromHTTPServer from "../socketio";

interface BuiltApp {
    server: http.Server
    socketIO?: socketio.Server
    koa?: Application

    run(): void
}

interface IAppBuilderConfig {
    port?: number
    host?: string
}

export default class AppBuilder {
    private _enableSocketIO: boolean = true
    private _enableApi: boolean = true
    private _cfg: IAppBuilderConfig = {
        port: 8000
    }

    disableApi(): this {
        this._enableApi = false
        return this
    }

    disableSocketIO(): this {
        this._enableSocketIO = false
        return this
    }

    port(v: number): this {
        this._cfg.port = v
        return this
    }

    build(): BuiltApp {
        if (!(this._enableSocketIO || this._enableApi))
            throw new Error('you cannot disable both api and socket.io server')
        let app = this._enableApi ? createApp() : undefined
        let sio: socketio.Server | undefined
        const server = app ? http.createServer(app.callback()) : http.createServer()

        if (this._enableSocketIO)
            sio = createSocketIOFromHTTPServer(server)

        return {
            server,
            koa: app,
            socketIO: sio,
            run: () => {
                server.listen(this._cfg.port, this._cfg.host)
                const address = server.address()
                const port = typeof address === 'string' ? +address.split(':')[1] : address.port
                const host = typeof address === 'string' ? +address.split(':')[0] : address.address
                console.log(`👉 Server listening on ${host}:${port}`)
            }
        }
    }
}
