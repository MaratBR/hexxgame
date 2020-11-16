import {Schema, type} from "@colyseus/schema";

export class ClientInfo extends Schema {
    @type('string')
    dbID: string

    @type('number')
    team: number = 0

    @type('string')
    username: string

    @type('boolean')
    ready: boolean = false;
}

export class TeamInfo extends Schema {
    @type('boolean')
    ready: boolean = false;

    @type(['string'])
    members: string[] = []
}

export class LobbyState extends Schema {
    @type('string')
    id?: string;

    @type('string')
    selectedMapID?: string

    @type('number')
    teamsNum?: number = 0

    @type({map: ClientInfo})
    clients: {[key: string]: ClientInfo} = {}

    @type(['string'])
    spectators: string[] = []

    @type([TeamInfo])
    teams: TeamInfo[] = []
}