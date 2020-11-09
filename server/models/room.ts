import {getModelForClass, prop} from "@typegoose/typegoose";
import {Base, IDBase} from "./base";

export function generateRoomId(len: number = 7): string {
    return Math.random().toString(36).substr(2, len).toUpperCase()
}


export class Room extends Base {
    @prop()
    ownerId?: string

    @prop({default: false})
    isPublic?: boolean

    @prop({required: true, minlength: 1, maxlength: 50})
    name?: string

    @prop({default: () => new Date()})
    createdAt?: Date

    @prop()
    selectedMapId?: string

    @prop()
    ongoingMatchId?: string
}

export const RoomModel = getModelForClass(Room)

export type RoomInfoDto = {
    id: string
    name: string
    isPublic: boolean
    selectedMatchId?: string
    ongoingMatchId?: string
}

export function roomInfo(room: Room): RoomInfoDto {
    return {
        id: room._id,
        name: room.name,
        isPublic: room.isPublic,
        selectedMatchId: room.selectedMapId,
        ongoingMatchId: room.ongoingMatchId
    }
}