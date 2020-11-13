import {Participant} from "server/models/Match";

export type GameMapInfoDto = {
    name: string
    createdAt: Date
    cellsCount: number
    maxTeams: number
    authorId?: string
}

export type GameMatchInfoDto = {
    id: string
    mapId: string
    players: Participant[]
}

export type RoomInfoDto = {
    id: string
    name: string
    isPublic: boolean
    selectedMatchId?: string
    ongoingMatchId?: string
}

export type UserInfoDto = {
    username: string,
    isAnon?: boolean,
    id: string
}

export type PlayerInfoDto = {
    username: string
    isAnon?: boolean
    id: string
}

export enum MoveDirection {
    Top,
    Bottom,
    TopRight,
    TopLeft,
    BottomRight,
    BottomLeft
}

export type MatchStats = {
    totalPoints: number
    totalCells: number
    maxPoints: number
    teamPoints: number[]
}
