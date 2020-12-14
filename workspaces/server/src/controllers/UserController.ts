import {
    Authorized,
    Body,
    Controller,
    CurrentUser,
    ForbiddenError,
    Get,
    HttpError,
    Param,
    Post
} from "routing-controllers";
import {User, userInfo} from "../models/User";
import UsersService from "../services/UsersService";
import {message} from "./api";

@Controller('/api/users')
export class UserController {
    constructor(private readonly service: UsersService) {
    }

    @Get('/:id')
    @Authorized()
    async getUserInfo(@Param('id') id: string) {
        const user = await this.service.getUser(id)
        return userInfo(user)
    }

    @Post('/updateUsername')
    @Authorized()
    async updateUsername(@CurrentUser() user: User, @Body() data: any) {
        if (user.isAnon)
            throw new ForbiddenError('you cannot change the name of anonymous user')
        if (typeof data === 'object' && data !== null && typeof data.username === 'string') {
            await this.service.updateUser(user._id, {username: data.username})
            return message('done')
        }
        throw new HttpError(422, 'invalid body structure')
    }
}