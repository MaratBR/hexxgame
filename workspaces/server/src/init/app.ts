import Application, {Context} from "koa";
import {logger as koaLogger} from "koa2-winston"
import koaCookie from "koa-cookie"
import koaPassport from "koa-passport";
import koaSession from "koa-session";
import {SESSION_CONFIG} from "./session";
import {Action, useContainer, useKoaServer} from "routing-controllers";
import {resolve} from "path";
import config from "../config";
import {Container} from "typedi";
import koaCors from "koa-cors";
import logger from "./logger";


export interface IAppParams {
    useLogger: boolean
}

export default function createApp(cfg?: Partial<IAppParams>): Application {
    const app = new Application()

    app.keys = [config.keys.main]

    if (cfg?.useLogger || true)
        app.use(koaLogger({logger: logger}))

    app.use(koaCors({
        credentials: true,
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        headers: ['X-Requested-With', 'X-HTTP-Method-Override', 'Content-Type', 'Accept']
    }))
    app.use(koaCookie())
    app.use(koaSession(SESSION_CONFIG, app))
    app.use(koaPassport.initialize())
    app.use(koaPassport.session())

    useContainer(Container)

    useKoaServer(app, {
        controllers: [
            resolve(__dirname, '../controllers/*.ts')
        ],
        authorizationChecker: (action: Action) => {
            const ctx: Context = action.context
            return ctx.isAuthenticated()
        },
        currentUserChecker: (action: Action) => action.context.state.user,
        classTransformer: true
    })

    return app
}