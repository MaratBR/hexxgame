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