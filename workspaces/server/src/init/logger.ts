import winston from "winston";
import config from "../config";

const logger = winston.createLogger({
    level: config.debug ? 'debug' : 'info',
    transports: [
        new winston.transports.File({filename: config.logging.all}),
        new winston.transports.File({filename: config.logging.error, level: 'error'}),
        new winston.transports.Console()
    ]
})

export default logger