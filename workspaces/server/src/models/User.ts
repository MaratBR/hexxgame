import {getModelForClass, prop} from "@typegoose/typegoose";
import {Base, IDBase} from "./Base";
import {nanoid as nanoidAsync} from "nanoid/async";
import {PlayerInfoDto, UserInfoDto} from "@hexx/common";
import {Room, RoomModel} from "./Room";
import {Match} from "./Match";

export interface GameSession {
    matchId?: string;
    online?: boolean;
    roomId?: string;
}

export class User extends Base {
    @prop({minlength: 1, maxlength: 50, required: true})
    username: string;

    @prop()
    anonToken?: string;

    @prop()
    passwordHash?: string;

    @prop({default: () => new Date()})
    createdAt?: Date;

    @prop({default: false})
    isAnon?: boolean;

    @prop()
    uaMD5?: string

    @prop()
    personalRoomId?: string

    @prop()
    gameSession?: GameSession;

    setRoom(room: Room) {
        return this._setRoom(room._id)
    }

    removeRoom() {
        return this._setRoom()
    }

    private _setRoom(roomId?: string) {
        this.gameSession = this.gameSession || {}
        this.gameSession.roomId = roomId
        return UserModel.update({_id: this._id}, roomId ? {'gameSession.roomId': roomId} : {$unset: {'gameSession.roomId': 1}}).exec()
    }

    setMatch(match: Match) {
        return this._setMatch(match._id)
    }

    removeMatch() {
        return this._setMatch()
    }

    private _setMatch(matchID?: string) {
        this.gameSession = this.gameSession || {}
        this.gameSession.matchId = matchID
        return UserModel.update({_id: this._id}, matchID ? {'gameSession.matchId': matchID} : {$unset: {'gameSession.matchId': 1}}).exec()
    }

    inRoom(): boolean {
        return !!(this.gameSession && this.gameSession.roomId)
    }

    getMatchID(): string | undefined {
        return this.gameSession?.matchId
    }

    getRoomID(): string | undefined {
        return this.gameSession?.roomId
    }

    async getRoom(): Promise<Room | null> {
        if (!this.getRoomID())
            return null
        const room = RoomModel.findById(this.getRoomID())
        if (room)
            return room
        throw new Error('room not found')
    }

    toPlayerInfo(): PlayerInfoDto {
        return {
            id: this._id,
            username: this.username,
            isAnon: this.isAnon
        }
    }
}

export async function generateUserIdAsync(isAnon: boolean = false) {
    return (isAnon ? 'A' : 'U') + '.' + await nanoidAsync()
}


export const UserModel = getModelForClass(User)

export function userInfo(user: User) {
    return <UserInfoDto>{
        username: user.username,
        isAnon: user.isAnon,
        id: user._id as string
    }
}