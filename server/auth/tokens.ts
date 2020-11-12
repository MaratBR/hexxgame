import jwt from "jsonwebtoken"
import config from "../config";
import {v4} from "uuid";
import {User} from "../models/User";

export type TokenData<TPurpose extends string = string> = {
    jti: string
    sub: string
    aud: string
    iss: string
    purpose: string
}

export type LoginData = TokenData<'authentication'> & {
    name: string
}

export type Token<T extends object> = T & {aud: string, iss: string, exp: number}

export default class Tokens {
    static AUTHENTICATION = 'authentication'
    static SOCKET = 'socket'

    public static generateToken(user: User, purpose: string, opts?: jwt.SignOptions): string {
        return jwt.sign({
            jti: v4(),
            sub: user._id,
            iss: config.jwt.issuer,
            aud: config.jwt.audience,
            name: user.username,
            anon: user.isAnon,
            purpose
        }, config.keys.jwtSecret, {
            expiresIn: "7 days",
            ...(opts || {})
        })
    }

    public static generateLoginToken(user: User): string {
        return Tokens.generateToken(user, this.AUTHENTICATION, {
            expiresIn: "30 hours"
        })
    }

    public static generateSocketToken(user: User): string {
        return Tokens.generateToken(user, this.SOCKET, {
            expiresIn: "5 minutes"
        })
    }
}