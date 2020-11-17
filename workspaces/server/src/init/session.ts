import {REDIS_CLIENT} from "./redis";
import koaSession from 'koa-session'
import redisStore from "koa-redis";
import Application from "koa";
import config from "../../config";

export default function makeSession(app: Application) {
    return koaSession(SESSION_CONFIG, app)
}

export const REDIS_STORE = redisStore({
    client: REDIS_CLIENT
})

export const SESSION_CONFIG = {
    ...config.session,
    store: REDIS_STORE
}
