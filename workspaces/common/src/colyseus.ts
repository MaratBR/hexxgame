import Dict = NodeJS.Dict;

export interface IClientInfo {
    dbID: string
    team: number
    username: string
    ready: boolean
}

export interface ITeamInfo {
    ready: boolean
    members: string[]
}

export interface IGameLobbyState {
    id?: string;
    selectedMapID?: string
    teamsNum: number
    clients: {[key: string]: IClientInfo}
    spectators: string[]
    teams: ITeamInfo[]
    match?: IMatchState
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
    mapCells: Dict<MatchMapCell>
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
    teamCells: Dict<number>
    teamPoints: Dict<number>
    totalPoints: number
}