import Application from "koa";
import koaLogger from "koa-logger"
import koaCookie from "koa-cookie"
import koaPassport from "koa-passport";

export default function createApp(): Application {
    const app = new Application()

    app.use(koaLogger())
    app.use(koaCookie())
    app.use(koaPassport.initialize())
    app.use(koaPassport.session())

    return app
}