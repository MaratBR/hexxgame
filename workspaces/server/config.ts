const ENV = process.env.NODE_ENV || 'development'
const DEBUG = !!(process.env.DEBUG || ENV != 'production')

const config = {
    debug: DEBUG,
    env: ENV,
    keys: {
        main: 'secretsecret',
        jwtSecret: 'sfdgfhedhrghfgefghasdgfjrijfkljkfeijkrhfjknwshfjrlnjhfkldmfesrdfthgjksrdftghjdrfg'
    },

    jwt: {
        issuer: 'hexx',
        audience: 'hexx-ui',

    },

    redis: {
        host: process.env.NODE_REDIS_IP || '127.0.0.1',
        port: +(process.env.NODE_REDIS_PORT || 6379)
    },

    session: {
        key: 'HGS',
        maxAge: 60 * 60 * 24 * 120,
        secure: !DEBUG,
        renew: false,
        prefix: 'session'
    },

    db: {
        uri: 'mongodb://localhost:27017/hexx-koa'
    },

    cors: {
        origin: 'http://localhost:3000'
    }
}

export default config