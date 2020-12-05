import {getModelForClass, prop} from "@typegoose/typegoose";
import {Base, IDBase} from "./Base";
import {RoomInfoDto} from "@hexx/common/src/dto";
import {User} from "./User";
import {Match, MatchModel} from "./Match";

export function generateRoomId(len: number = 7): string {
    return Math.random().toString(36).substr(2, len).toUpperCase()
}

export type RoomUser = {
    id: string,
    team: number
}

export class Room extends Base {
    @prop()
    ownerId?: string

    @prop({default: () => new Date()})
    createdAt?: Date

    @prop()
    selectedMapId?: string

    @prop()
    ongoingMatchId?: string

    @prop()
    players: RoomUser[]

    @prop()
    teamMembers?: string[][]

    hasPlayer(player: string | User) {
        player = typeof player === 'string' ? player : player._id
        return this.players.findIndex(p => p.id == player) != -1
    }

    getOngoingMatch(): Promise<Match | null> {
        return this.ongoingMatchId ? MatchModel.findById(this.ongoingMatchId).exec() : Promise.resolve(null)
    }

    getSocketIORoomName() {
        return 'Vroom' + this._id // idk, don't ask
    }

    static async exists(id: string): Promise<boolean> {
        return RoomModel.count({_id: id}).then(c => c != 0)
    }

    removePlayer(id: string) {
        if (this.hasPlayer(id)) {
            this.players.splice(this.players.findIndex(p => p.id == id))
            return RoomModel.update({_id: id}, {$pull: {players: {id}}}).exec()
        }
    }

    getUserTeam(id: string): number {
        const player = this.players.find(p => p.id == id)
        return player ? player.team : -1
    }

    async setUserTeam(userID: string, team: number): Promise<boolean> {
        if (!this.teamMembers)
            return false
        const t = this.getUserTeam(userID)
        team = Math.max(Math.min(Math.floor(team), this.teamMembers.length), 0)
        if (t !== team) {
            this.teamMembers[t].splice(this.teamMembers[t].indexOf(userID))
            this.teamMembers[team].push(userID)

            await MatchModel.update({_id: this._id}, {
                $pull: {['teamMembers.' + t]: userID},
                $addToSet: {['teamMembers.' + team]: userID}
            })
            return true
        }
        return false
    }
}

export const RoomModel = getModelForClass(Room)

export function roomInfo(room: Room): RoomInfoDto {
    return {
        id: room._id,
        name: room._id,
        isPublic: false,
        selectedMatchId: room.selectedMapId,
        ongoingMatchId: room.ongoingMatchId
    }
}