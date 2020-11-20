import {BaseContext, Next} from "koa";
import Koa from "koa"
import {Strategy as LocalStrategy, VerifyFunction as LocalVerifyFunction} from "passport-local"
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

const localVerifyFunction: LocalVerifyFunction = async (login: string, password: string, done) => {
    const service = Container.get(UsersService)
    const user = await service.findUserByLogin(login)

    if (user) {
        if (await Hasher.verify(password, user.passwordHash)) {
            done(null, user)
            return
        }
    }
    done(new Error('user not found'))
}

const localStrategy = new LocalStrategy({
    usernameField: 'username',
    passwordField: 'passwordHash',
    session: false,
    passReqToCallback: false
}, localVerifyFunction)

let koaPasswordReady = false

export function initPassport() {
    if (!koaPasswordReady) {
        koaPasswordReady = true
        koaPassport.use('local', localStrategy)
        koaPassport.serializeUser<User, string>((user, done) => done(null, user._id))
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

