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

export class MatchParticipant extends Schema {
    @type('string')
    dbID: string

    @type('number')
    team: number

    @type('string')
    username: string

    @type('boolean')
    online: boolean = true;
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

    @type('string')
    selectedCellKey?: string;

    @type({map: MatchParticipant})
    participants: MapSchema<MatchParticipant> = new MapSchema<MatchParticipant>()

    @type('number')
    winner: number = 0

    static isPowerStage(s: MatchState) { return s.currentRoundStage == 2 }
    static isAttackStage(s: MatchState) { return s.currentRoundStage == 1 }

    static isPowerStageFor(s: MatchState, team: number) {
        return this.isPowerStage(s) && s.currentTeam === team
    }

    static isAttackStageFor(s: MatchState, team: number) {
        return this.isAttackStage(s) && s.currentTeam === team && team > 0
    }

    static getParticipantTeam(s: MatchState, dbID: string) {
        const participantData = s.participants.get(dbID)
        return participantData ? participantData.team : 0
    }
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

    static getUserDBID(s: GameRoomState, clientID: string): string | undefined {
        const clientData = s.clients.get(clientID)
        return clientData ? clientData.dbID : undefined
    }

    static getParticipantTeamFromClientID(s: GameRoomState, clientID: string) {
        const match = s.match
        if (!match)
            return 0
        const dbID = this.getUserDBID(s, clientID)
        if (!dbID)
            return 0
        return MatchState.getParticipantTeam(match, dbID)
    }
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
