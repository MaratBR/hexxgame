import dotenv from "dotenv";

dotenv.config()

const ENV = process.env.NODE_ENV || 'development'
const DEBUG = !!(process.env.DEBUG || ENV != 'production')

const config = {
    debug: DEBUG,
    env: ENV,
    host: process.env.HOST,
    port: 8000,

    google: {
        clientID: process.env.GOOGLE_OATH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OATH_CLIENT_SECRET
    },

    oauth: {
        doneRedirect: process.env.OAUTH_REDIRECT_URL
    },

    keys: {
        main: process.env.SECRET_KEY_MAIN,
        jwtSecret: process.env.SECRET_KEY_JWT
    },

    jwt: {
        issuer: process.env.JWT_ISSUER || 'hexx',
        audience: process.env.JWT_AUDIENCE || 'hexx-ui'
    },

    redis: {
        host: process.env.REDIS_IP || '127.0.0.1',
        port: +(process.env.REDIS_PORT || 6379)
    },

    session: {
        key: 'HGS',
        maxAge: 60 * 60 * 24 * 120,
        secure: !DEBUG,
        renew: false,
        prefix: 'session',
        domain: process.env.COOKIES_DOMAIN || undefined
    },

    db: {
        uri: process.env.MONGODB_URI
    },

    cors: {
        origin: process.env.CORS
    },
    logging: {
        error: process.env.ERROR_LOG,
        all: process.env.ALL_LOG
    }
}

export default config