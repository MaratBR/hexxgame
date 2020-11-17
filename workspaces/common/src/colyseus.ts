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

export interface ILobbyState {
    id?: string;
    selectedMapID?: string
    teamsNum: number
    clients: {[key: string]: IClientInfo}
    spectators: string[]
    teams: ITeamInfo[]
}