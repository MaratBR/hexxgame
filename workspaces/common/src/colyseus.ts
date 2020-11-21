import {ArraySchema, MapSchema} from "@colyseus/schema"

export interface IClientInfo {
    dbID: string
    team: number
    username: string
    ready: boolean
}

export interface ITeamInfo {
    ready: boolean
    members: ArraySchema<string>
}

export interface IGameLobbyState {
    id?: string;
    selectedMapID?: string
    clients: MapSchema<IClientInfo>
    spectators: ArraySchema<string>
    teams: ArraySchema<ITeamInfo>
    match: Partial<IMatchState>
}

export interface MatchMapCell {
    x: number
    y: number
    team?: number
    value: number
    maxValue?: number
    locked: boolean
}

export interface IMatchState {
    id: string
    teamsRotation: number[]
    mapCells: MapSchema<MatchMapCell>
    startsAt: number
    currentRound: number
    currentRoundStage: number
    roundStageEndsAt: number
    currentTeam: number
    powerPoints: number
    domination?: IGameDominationState
}

export interface IGameDominationState {
    cells: number
    teamCells: MapSchema<number>
    teamPoints: MapSchema<number>
    totalPoints: number
}