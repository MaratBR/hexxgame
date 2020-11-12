import Application, {Context} from "koa";
import koaLogger from "koa-logger"
import koaCookie from "koa-cookie"
import koaPassport from "koa-passport";
import koaSession from "koa-session";
import {SESSION_CONFIG} from "./session";
import {Action, useContainer, useKoaServer} from "routing-controllers";
import {resolve} from "path";
import config from "../config";
import {Container} from "typedi";
import koaCors from "koa-cors";


export interface IAppParams {
    useLogger: boolean
}

export default function createApp(cfg?: Partial<IAppParams>): Application {
    const app = new Application()

    app.keys = [config.keys.main]

    if (cfg?.useLogger || true)
        app.use(koaLogger())

    app.use(koaCors({
        credentials: true,
        origin: config.cors.origin
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