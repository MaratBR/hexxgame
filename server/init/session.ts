import {REDIS_CLIENT} from "./redis";
import redisStore from "koa-redis";

export const REDIS_STORE = redisStore({
    client: REDIS_CLIENT
})