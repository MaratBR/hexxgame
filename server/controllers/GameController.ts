import {Authorized, Controller, CurrentUser, Get} from "routing-controllers";
import {User} from "../models/User";
import Tokens from "../auth/tokens";

@Controller('/api/game')
@Authorized()
export default class GameController {
    @Get('/session')
    getSession(@CurrentUser() user: User) {
        return user.gameSession || null
    }
}