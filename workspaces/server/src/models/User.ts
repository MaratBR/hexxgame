import {getModelForClass, prop} from "@typegoose/typegoose";
import {Base} from "./Base";
import {UserInfoDto, UserStats} from "@hexx/common";
import {Room, RoomModel} from "./Room";
import {Match} from "./Match";
import {nanoid} from "nanoid";
import {Profile} from "passport-google-oauth20";

export interface GameSession {
    matchId?: string;
    online?: boolean;
    roomId?: string;
}

export function emptyMovesStats() {
    return {total: 0, absorb: 0, capture: 0, suicide: 0, tie: 0}
}

export function emptyStats(): UserStats {
    return {
        moves: emptyMovesStats(),
        matchesParticipated: 0,
        matchesWon: 0
    }
}

export class User extends Base {
    constructor(name: string, isAnon: boolean = false) {
        super();
        this.username = name
        this.isAnon = isAnon
        this._id = generateUserId(isAnon)
    }

    static googleUser(profile: Profile) {
        const user = new User(profile.displayName)
        user.googleId = profile.id
        user.avatarUrl = profile.photos.length ? profile.photos[0].value : undefined
        return user
    }

    static anon() {
        return new User(this.generateRandomAnonymousName(), true)
    }

    private static NAMES = [
        'Eagle', 'Sheep', 'Rabbit', 'Dolphin', 'Lion', 'Mule', 'Rooster', 'Dingo', 'Chamois', 'Deer', 'Turtle',
        'Parrot', 'Cow', 'Hamster', 'Bear', 'Ox', 'Chinchilla', 'Raccoon', 'Snake', 'Buffalo', 'Pony', 'Zebra',
        'Opossum'
    ]

    private static ADJECTIVES = [
        'Dangerous', 'Suspicious', 'Recurring', 'Kind', 'Evil', 'Crazy', 'Lovely', 'Sentimental', 'Friendly', 'Silent',
        'Opaque', 'Exiled', 'Happy', 'Sad', 'Graceful', 'Wealthy', 'Romantic', 'Humble', 'Forgetful', 'Cute', 'Energetic',
        'Nervous', 'Lazy', 'Worried', 'Jealous', 'Thoughtless', 'Unbearable', 'Ultimate', 'Fancy', 'Lively', 'Wicked'
    ]

    private static generateRandomAnonymousName(): string {
        return User.ADJECTIVES[Math.floor(Math.random() * User.ADJECTIVES.length)] + ' ' +
            User.NAMES[Math.floor(Math.random() * User.NAMES.length)]

    }

    @prop({minlength: 1, maxlength: 50, required: true})
    username: string;

    @prop()
    avatarUrl?: string;

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

    @prop({default: null})
    googleId?: string | null = null

    @prop({default: emptyStats})
    stats: UserStats = emptyStats()

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
}

export function generateUserId(isAnon: boolean = false) {
    return (isAnon ? 'A' : 'U') + '.' + nanoid()
}


export const UserModel = getModelForClass(User)

export function userInfo(user: User) {
    return <UserInfoDto>{
        username: user.username,
        isAnon: user.isAnon,
        id: user._id as string,
        stats: user.stats,
        picUrl: user.avatarUrl
    }
}