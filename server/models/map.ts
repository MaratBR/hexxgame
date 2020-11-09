import {getModelForClass, prop} from "@typegoose/typegoose";
import {IDBase} from "./base";

export interface GameMapCell {
    x: number
    y: number
    max?: number
    initValue?: number
    initTeam?: number
}

export class GameMap extends IDBase {
    @prop()
    authorId?: string

    @prop()
    description?: string;

    @prop({required: true, minlength: 1, maxlength: 50})
    name: string

    @prop({default: () => new Date()})
    createdAt?: Date

    @prop({required: true})
    cells: GameMapCell[]

    @prop()
    maxTeams: number
}

export const GameMapModel = getModelForClass(GameMap)

export type GameMapInfoDto = {
    name: string
    createdAt: Date
    cellsCount: number
    maxTeams: number
    authorId?: string
}

export function gameMapInfo(map: GameMap): GameMapInfoDto {
    return {
        name: map.name,
        authorId: map.authorId,
        maxTeams: map.maxTeams,
        createdAt: map.createdAt,
        cellsCount: map.cells.length
    }
}
