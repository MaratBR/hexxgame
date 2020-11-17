import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";

type PlayPageState = {
    roomID?: string
}

class PlayPage extends React.Component<any, PlayPageState> {
    static contextType = ApiContext;
    context!: AppAPI
    state: PlayPageState = {}

    render() {
        return <div>
            <h3>Join room</h3>
            <div className="spacing">
                <input className="input display" type="text"/>
            </div>

            <div className="buttons">
                <button className="button" onClick={() => this.joinRoom()}>Join</button>
                <button className="button" onClick={() => this.joinPrivateRoom()}>Join personal room</button>
            </div>
        </div>
    }

    private async joinPrivateRoom() {
        const room = await this.context.getPersonalRoom()
        await this._joinRoom(room.id)
    }

    private joinRoom() {

    }

    private async _joinRoom(id: string) {
        await this.context.joinRoom(id)
    }
}

export default PlayPage