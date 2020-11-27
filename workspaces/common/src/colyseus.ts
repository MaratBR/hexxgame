import {ArraySchema, MapSchema} from "@colyseus/schema"

import {Schema, type} from "@colyseus/schema";

export class ClientInfo extends Schema implements IClientInfo {
    @type('string')
    dbID: string

    @type('number')
    team: number = 0

    @type('string')
    username: string

    @type('boolean')
    ready: boolean = false;
}

export class DominationState extends Schema implements IGameDominationState {
    @type('number')
    cells: number = 0;

    @type({map: 'number'})
    teamCells: MapSchema<number> = new MapSchema<number>();

    @type({map: 'number'})
    teamPoints: MapSchema<number> = new MapSchema<number>();

    @type('number')
    totalPoints: number = 0;
}

export class MapCell extends Schema implements MatchMapCell {
    @type('number')
    x: number

    @type('number')
    y: number

    @type('number')
    value: number = 0;

    @type('number')
    maxValue?: number

    @type('number')
    team: number = 0

    @type('boolean')
    locked: boolean = false
}


export class MatchState extends Schema implements IMatchState {
    @type('number')
    baseRoundLength: number = 20

    @type('number')
    roundLengthPerCell: number = 5

    @type('number')
    roundLengthPerPoint: number = 1.5

    @type('number')
    currentRound: number = 0;

    @type('number')
    currentRoundStage: number = 0;

    @type('number')
    currentMoveID: number = 0;

    @type('string')
    id: string;

    @type({map: MapCell})
    mapCells: MapSchema<MapCell>;

    @type('number')
    roundStageEndsAt: number;

    @type('number')
    startsAt: number;

    @type(['number'])
    teamsRotation: number[];

    @type('number')
    currentTeam: number = 0

    @type('number')
    powerPoints: number = 0;

    @type(DominationState)
    domination: DominationState
}

export class TeamInfo extends Schema {
    @type('boolean')
    ready: boolean = false;

    @type(['string'])
    members: ArraySchema<string> = new ArraySchema<string>()
}

export class GameRoomState extends Schema implements IGameLobbyState {
    @type('string')
    id?: string;

    @type('string')
    selectedMapID?: string

    @type({map: ClientInfo})
    clients: MapSchema<ClientInfo> = new MapSchema<ClientInfo>()

    @type(['string'])
    spectators: ArraySchema<string> = new ArraySchema<string>()

    @type([TeamInfo])
    teams: ArraySchema<TeamInfo> = new ArraySchema<TeamInfo>()

    @type('number')
    gameStartsAt: number

    @type(MatchState)
    match: MatchState | null
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
