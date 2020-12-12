import {BaseContext, BaseRequest, Context, Request, Response} from "koa";
import {
    Authorized,
    Ctx,
    CurrentUser,
    Get,
    JsonController,
    Post, Redirect,
    Req, UseBefore,
} from "routing-controllers";
import passport  from "koa-passport";
import UsersService from "../services/UsersService";
import {User, userInfo} from "../models/User";
import {message} from "./api";
import Tokens from "../auth/tokens";
import config from "../config";

@JsonController('/api/auth')
export class AuthController {
    constructor(private userService: UsersService) {}

    @Authorized()
    @Get('/checkLogin')
    async login(@CurrentUser() user: User) {
        return message(`hi, ${user.username}!`)
    }

    @Authorized()
    @Get('/getGameToken')
    async generateGameToken(@Ctx() ctx: Context) {
        if (!ctx.session.gameToken || (+new Date() >= ctx.session.gameTokenExp)) {
            const token = await Tokens.generateSocketToken(ctx.state.user)
            ctx.session.gameToken = token.str
            ctx.session.gameTokenExp = token.exp
            ctx.session.save()
        }
        return {
            token: ctx.session.gameToken,
            exp: ctx.session.gameTokenExp
        }
    }

    @Post('/login/anon')
    async loginAsAnon(@Req() req: BaseRequest, @Ctx() ctx: Context, @CurrentUser() currentUser?: User) {
        if (currentUser) {
            return this.responseForNewUser(currentUser)
        }
        const user = await this.userService.loginAsAnon(req)
        await ctx.login(user)
        return this.responseForNewUser(user)
    }

    @Get('/google')
    @UseBefore(passport.authenticate("google", {scope: ["profile"]}))
    googleLogin(@CurrentUser() user: User) {
        return {user}
    }

    loginGoogleRedirect = passport.authenticate('google')

    @Get('/google/redirect')
    @UseBefore(passport.authenticate('google'))
    @Redirect(config.oauth.doneRedirect)
    redirect(@CurrentUser() user: User) {}

    @Authorized()
    @Get('/currentUser')
    getCurrentUser(@CurrentUser() user: User) {
        return userInfo(user)
    }

    @Post('/logout')
    async logout(@Ctx() ctx: Context) {
        await ctx.logout()
        ctx.session = null
        return null
    }


    responseForNewUser(user: User) {
        return {
            message: 'registration successful, hi ' + user.username + '!'
        }
    }
}