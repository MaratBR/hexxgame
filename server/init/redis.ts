import config from "../config";
import IORedis from "ioredis";


export const REDIS_CLIENT = new IORedis({
    host: config.redis.host,
    port: config.redis.port
})
