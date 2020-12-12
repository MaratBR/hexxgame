import React from "react";
import ApiContext from "../../game/context";
import AppAPI from "../../game/AppAPI";
import styles from "./PlayPage.module.scss"
import ModalNotification from "../../components/ModalNotification";
import GoogleAuthButton from "../../components/GoogleAuthButton";

type PlayPageState = {
    roomID?: string
    code?: string
    error?: string
    personalRoom?: string
    bgIndex: number
    isAnon?: boolean
    username?: string
}

const BGS = [
    'linear-gradient(-168deg, rgb(57 57 57), rgb(10 5 17))',
    'linear-gradient(-168deg, #3f85d3, #5306b8)',
    'linear-gradient(-168deg, #d33fcb, #b80640)',
    'linear-gradient(-168deg, #9ed33f, #06b83d)',
    'linear-gradient(-168deg, #7686a6, #282a3b)'
]

class PlayPage extends React.Component<any, PlayPageState> {
    static contextType = ApiContext;
    context!: AppAPI
    state: PlayPageState = {
        bgIndex: 0
    }

    async componentDidMount() {
        try {
            const {username} = await this.context.getUserInfo()
            this.setState({username})
        } catch (e) {
            this.props.history.push('/')
        }

        const bgIndex = localStorage.getItem('bgIndex') || '0'
        this.setState({
            bgIndex: Math.min(Math.max(+bgIndex || 0, 0), BGS.length - 1)
        })
        this.context.getUserInfo().then(({isAnon}) => {
            this.setState({isAnon})
        })
    }

    private nextBgIndex() {
        const bgIndex = this.state.bgIndex == BGS.length - 1 ? 0 : this.state.bgIndex + 1
        this.setState({
            bgIndex
        })
        localStorage.setItem('bgIndex', bgIndex+'')
    }

    render() {
        return <div className={styles.root} style={{background: BGS[this.state.bgIndex]}}>
            <button className={styles.changeAppearenceButton} onClick={() => this.nextBgIndex()}>change that</button>
            {this.state.isAnon === true ? undefined : <small>Hi, {this.state.username}!</small>}
            <h3>Join room</h3>
            <div className="spacing">
                <input className="input display" type="text" onChange={(e) => this.setState({code: e.target.value})} />
            </div>

            <div className="buttons">
                <button disabled={!this.state.code} onClick={() => this.joinRoom()}>Join</button>
                <button onMouseOver={() => this.fetchPersonalRoom()} 
                        onClick={() => this.joinPrivateRoom()}
                        title={this.state.personalRoom}>
                    Join personal room
                </button>
            </div>

            <div className={styles.bottomNote}>
                {this.state.isAnon ? <span>You have an anonymous account,<br/> your progress won't be saved</span> : undefined}

                <div className="buttons">
                    <button onClick={() => this.logout()}>logout</button>
                    {this.state.isAnon ? <GoogleAuthButton /> : undefined}
                </div>
            </div>

            {this.state.error ? <ModalNotification title="Error" onClose={() => this.setState({error: undefined})}>
                <div>{this.state.error}</div>
            </ModalNotification> : undefined}
        </div>
    }

    private async logout() {
        await this.context.logout()
        window.location.reload()
    }

    private googleLogin() {
        this.context.googleLogin()
    }

    private async joinPrivateRoom() {
        const room = await this.context.getPersonalRoom()
        await this._joinRoom(room.id)
        this.props.history.push(this.props.match.path + '/room/' + room.id)
    }

    private async joinRoom() {
        if (!this.state.code)
            return
        try {
            await this._joinRoom(this.state.code)
            this.props.history.push(this.props.match.path + '/room/' + this.state.code)
        } catch (e) {
            this.setState({error: e.toString()})
        }
    }

    private async fetchPersonalRoom() {
        if (this.state.personalRoom)
            return
        this.setState({
            personalRoom: (await this.context.getPersonalRoom()).id
        })
    }

    private async _joinRoom(id: string) {
        await this.context.joinRoom(id)
    }
}

export default PlayPage