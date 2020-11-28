
export interface Participant {
    id: string
    online: boolean
    team: number
}

export type GameMapInfoDto = {
    name: string
    createdAt: Date
    cellsCount: number
    maxTeams: number
    authorId?: string
    id: string
}

export interface GameMapCell {
    x: number
    y: number
    max?: number
    initValue?: number
    initTeam?: number
}

export type GameMapData = {
    info: GameMapInfoDto,
    cells: GameMapCell[]
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
    TopRight,
    Right,
    BottomRight,
    BottomLeft,
    Left,
    TopLeft
}
