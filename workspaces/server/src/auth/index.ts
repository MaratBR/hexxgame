import {BaseContext, Next} from "koa";
import Koa from "koa"
import {Strategy as LocalStrategy, VerifyFunction as LocalVerifyFunction} from "passport-local"
import {
    Profile,
    Strategy as GoogleStrategy,
    VerifyCallback,
    VerifyCallback as GoogleVerifyFunction
} from "passport-google-oauth20"
import koaPassport from "koa-passport";
import {Container} from "typedi";

import UsersService from "../services/UsersService";
import config from "../config";
import Hasher from "../misc/hash";
import {User, UserModel} from "../models/User";

async function prodAuthMiddleware(ctx: BaseContext, next: Next) {
    try {
        return await next()
    } catch (e) {
        if (typeof e.status === 'number' && e.status == 401) {
            ctx.status = 401
            ctx.body = {
                message: 'Access denied'
            }
        }
    }
}

const googleVerifyFunction = async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
    const service = Container.get(UsersService)
    const user = await service.getGoogleUserOrCreate(profile)

    if (user) {
        done(null, user)
    } else {
        done(new Error('user not found'))
    }
}

const googleStrategy = new GoogleStrategy({
    clientID: config.google.clientID,
    clientSecret: config.google.clientSecret,
    callbackURL: '/api/auth/google/redirect'
}, googleVerifyFunction)

let koaPasswordReady = false

export function initPassport() {
    if (!koaPasswordReady) {
        koaPasswordReady = true
        koaPassport.use('google', googleStrategy)
        koaPassport.serializeUser<User, string>((user: User, done) => done(null, user._id))
        koaPassport.deserializeUser<User, string>(async (userId, done) => {
            const user = await UserModel.findById(userId)
            if (user)
                done(null, user)
            else
                done(false)
        })
    }
}

;(() => initPassport())()

export function initAuth(app: Koa) {
    if (!config.debug) {
        app.use(prodAuthMiddleware)
    }
}

