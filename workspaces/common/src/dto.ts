import exp from "constants";

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

export enum MatchAction {
    Attack,
    PowerUp
}

export type AttackChange = {
    fromX: number
    fromY: number,
    direction: MoveDirection
}

export type PowerChange = {
    x: number
    y: number
    points: number
}

export type RoundHistory = {
    team: number
    stage: 1 | 2
    duration: number
    attacks: AttackChange[]
    powerUps: PowerChange[]
}

export type GameMatchHistoryDto = {
    match: GameMatchInfoDto
    mapCells: GameMapCell[]
    rounds: RoundHistory[]
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
