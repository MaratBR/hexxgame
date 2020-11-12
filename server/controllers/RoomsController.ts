import {Authorized, CurrentUser, Get, JsonController} from "routing-controllers";
import {User} from "../models/User";
import RoomService from "../services/RoomService";
import {roomInfo} from "../models/Room";

@JsonController('/api/rooms')
@Authorized()
export class RoomsController {
    constructor(private roomService: RoomService) {}

    @Get('/personalRoom')
    async getPersonalRoom(@CurrentUser() user: User) {
        const room = await this.roomService.getPersonalRoom(user)
        return roomInfo(room)
    }
}