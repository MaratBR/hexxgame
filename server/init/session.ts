import {REDIS_CLIENT} from "./redis";
import redisStore from "koa-redis";
import koaSession from 'koa-session'
import Application from "koa";
import config from "../config";

export const REDIS_STORE = redisStore({
    client: REDIS_CLIENT
})

export const SESSION_CONFIG = {
    ...config.session,
    store: REDIS_STORE
}

export default function makeSession(app: Application) {
    return koaSession(SESSION_CONFIG, app)
}