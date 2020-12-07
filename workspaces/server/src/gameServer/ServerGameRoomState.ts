import {GameRoomState} from "@hexx/common";
import {ServerMatchState} from "./ServerMatchState";

export class ServerGameRoomState extends GameRoomState {
    // NOTE: That is a BAD way to implement custom functions for match state
    // TODO: Use functions instead (like, regular functions not methods)
    // Or move logic to common package, sort of like Meteor does
    match: ServerMatchState = new ServerMatchState()

    get inGame() {
        return !!this.match.id
    }

    recalculateTeamReadyValue(team: number) {
        this.teams[team - 1].ready = this.teams[team - 1].members.length && this.teams[team - 1].members.every(clientID => {
            return this.clients[clientID].ready
        })
    }

    requireMatch() {
        if (!this.match.id)
            throw new Error('match does not have the id set, indicating that match does not exist')
        return this.match
    }
}