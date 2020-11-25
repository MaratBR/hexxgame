import {Schema, ArraySchema, type} from "@colyseus/schema";

export class TeamInfo extends Schema {
    @type('boolean')
    ready: boolean = false;

    @type(['string'])
    members: ArraySchema<string> = new ArraySchema<string>()
}