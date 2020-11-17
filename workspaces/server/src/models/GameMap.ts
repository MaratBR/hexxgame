import {getModelForClass, prop} from "@typegoose/typegoose";
import {IDBase} from "./Base";
import {GameMapInfoDto} from "@hexx/common/src/dto";

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

export function gameMapInfo(map: GameMap): GameMapInfoDto {
    return {
        name: map.name,
        authorId: map.authorId,
        maxTeams: map.maxTeams,
        createdAt: map.createdAt,
        cellsCount: map.cells.length,
        id: map._id
    }
}
