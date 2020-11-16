import {BaseContext, BaseRequest, Context, Response} from "koa";
import {
    Authorized,
    Ctx,
    CurrentUser,
    Get,
    JsonController,
    Post,
    Req,
} from "routing-controllers";
import UsersService from "../services/UsersService";
import {User} from "../models/User";
import {message} from "./api";
import Tokens from "../auth/tokens";

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

    responseForNewUser(user: User) {
        return {
            message: 'registration successful, hi ' + user.username + '!'
        }
    }
}