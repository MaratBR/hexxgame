import {Schema, type} from "@colyseus/schema";

export class TeamInfo extends Schema {
    @type('boolean')
    ready: boolean = false;

    @type(['string'])
    members: string[] = []
}