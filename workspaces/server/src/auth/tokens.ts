import jwt from "jsonwebtoken"
import config from "../../config";
import {v4} from "uuid";
import {User, UserModel} from "../models/User";
import Dict = NodeJS.Dict;

export type TokenData = {
    jti: string
    sub: string
    aud: string
    iss: string
    purpose: string
} & Dict<any>

export type GeneratedToken = {
    str: string
    data: TokenData
    exp: number
}

export default class Tokens {
    static AUTHENTICATION = 'authentication'
    static SOCKET = 'socket'

    public static generateToken(
        user: User,
        purpose: string,
        lifetime: number = 60 * 60
    ): GeneratedToken {
        const data: TokenData = {
            jti: v4(),
            sub: user._id,
            iss: config.jwt.issuer,
            aud: config.jwt.audience,
            name: user.username,
            anon: user.isAnon,
            purpose
        }
        const token = jwt.sign(data, config.keys.jwtSecret, {expiresIn: lifetime})
        return {
            str: token,
            data,
            exp: +new Date() + lifetime * 1000
        }
    }

    public static generateSocketToken(user: User): GeneratedToken {
        return Tokens.generateToken(user, this.SOCKET)
    }

    public static verifyToken(token: string, type?: string): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            jwt.verify(token,
                config.keys.jwtSecret,
                {issuer: config.jwt.issuer, audience: config.jwt.audience}, async (err, decoded) => {
                    resolve(!err && (typeof type === 'undefined' || type == (decoded as any).purpose))
                })
        })
    }

    public static getUserFromToken(token: string) {
        return new Promise<User | null>((resolve, reject) => {
            jwt.verify(token,
                config.keys.jwtSecret,
                {issuer: config.jwt.issuer, audience: config.jwt.audience}, async (err, decoded) => {
                if (err)
                    reject(err);
                else if (typeof decoded == 'string')
                    reject(new Error('cannot get user from string payload despite token being valid'))
                else {
                    const userId = (decoded as TokenData).sub
                    if (!userId)
                        reject(new Error('invalid token payload: sub claim is not present'))
                    else
                        resolve(await UserModel.findById(userId))
                }
            })
        })
    }
}