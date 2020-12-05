import {ArraySchema, MapSchema} from "@colyseus/schema"

import {Schema, type} from "@colyseus/schema";

export class ClientInfo extends Schema {
    @type('number')
    team: number = 0

    @type('string')
    username: string

    @type('boolean')
    ready: boolean = false
}

export class MatchParticipant extends Schema {
    @type('string')
    id: string

    @type('number')
    team: number

    @type('string')
    username: string

    @type('boolean')
    online: boolean = true;
}

export class DominationState extends Schema {
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

export class LastMatchResult extends Schema {
    @type('string')
    matchID: string

    @type('number')
    winner: number

    @type([MatchParticipant])
    participants: ArraySchema<MatchParticipant>
}

export class MatchState extends Schema {
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
    mapCells: MapSchema<MapCell> = new MapSchema<MapCell>()

    @type('number')
    roundStageEndsAt: number = 0

    @type('number')
    startsAt: number = 0

    @type(['number'])
    teamsRotation: number[] = []

    @type('number')
    currentTeam: number = 0

    @type('number')
    powerPoints: number = 0;

    @type(DominationState)
    domination: DominationState = new DominationState()

    @type('string')
    selectedCellKey: '' | string = ''

    @type({map: MatchParticipant})
    participants: MapSchema<MatchParticipant> = new MapSchema<MatchParticipant>()

    @type('number')
    winner: number = 0

    @type(LastMatchResult)
    lastMatchResult: LastMatchResult

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

export class GameRoomState extends Schema {
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
    match: MatchState = new MatchState()
}

export interface MatchMapCell {
    x: number
    y: number
    team?: number
    value: number
    maxValue?: number
    locked: boolean
}
