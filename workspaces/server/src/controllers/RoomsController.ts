import {Authorized, CurrentUser, Get, JsonController} from "routing-controllers";
import {User} from "../models/User";
import GameService from "../services/GameService";
import UsersService from "../services/UsersService";

@JsonController('/api/rooms')
@Authorized()
export class RoomsController {
    constructor(
        private readonly gameService: GameService,
        private readonly usersService: UsersService,
    ) {}

    @Get('/personalRoom')
    async getPersonalRoom(@CurrentUser() user: User) {
        if (!user.personalRoomId) {
            user.personalRoomId = await this.gameService.generateRoomId()
            await this.usersService.updateUser(user._id, {personalRoomId: user.personalRoomId})
        }
        return {
            room: user.personalRoomId
        }
    }
}