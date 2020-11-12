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

@JsonController('/api/auth')
export class AuthController {
    constructor(private userService: UsersService) {}

    @Get('/counter')
    async counter(@Ctx() context: Context) {
        context.session.count = context.session.count ? context.session.count + 1 : 1
        return {
            count: context.session.count
        }
    }

    @Authorized()
    @Get('/checkLogin')
    async login(@CurrentUser() user: User) {
        return message(`hi, ${user.username}!`)
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