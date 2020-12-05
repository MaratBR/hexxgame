import http from "http"
import Application from "koa"
import createApp, {IAppParams} from "./app";
import {mongoose} from "@typegoose/typegoose";
import config from "../config";
import {initAuth} from "../auth";
import getColyseus from "../gameServer/server";
import initDB from "./initDB";
import logger from "./logger";

interface BuiltApp {
    server: http.Server
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
    private _cfg: IAppBuilderConfig = {
        port: 8000,
        host: '0.0.0.0'
    }
    private _appCfg?: IAppParams

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
        const server = http.createServer(app.callback())
        const colyseus = getColyseus(server)
        if (app) {
            initAuth(app)
        }

        mongoose.connect(config.db.uri, { useNewUrlParser: true, useUnifiedTopology: true })
            .catch(console.error)
            .then(() => initDB())

        const db = mongoose.connection

        db.on('connecting', function() {
            logger.debug('connecting to MongoDB...')
        });

        db.on('error', function(error) {
            logger.error('Error in MongoDb connection: ' + error);
            mongoose.disconnect();
        })
        db.on('connected', function() {
            logger.debug('MongoDB connected!');
        });
        db.once('open', function() {
            logger.debug('MongoDB connection opened!');
        });
        db.on('reconnected', function () {
            logger.info('MongoDB reconnected!');
        });
        db.on('disconnected', function() {
            logger.warn('MongoDB disconnected! reconnecting...');
            mongoose.connect(config.db.uri, {server:{auto_reconnect:true}});
        });

        return {
            server,
            koa: app,
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
