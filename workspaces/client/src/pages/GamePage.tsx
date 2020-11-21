import React from "react";
import styles from "./GamePage.module.scss"
import Brand from "../components/Brand";
import {Route, NavLink, Redirect} from "react-router-dom";
import SettingsPage from "./game/SettingsPage";
import PlayPage from "./game/PlayPage";
import ApiContext from "../game/context";
import AppAPI from "../game/AppAPI";
import RoomPage from "./game/RoomPage";
import UIContext from "./UIContext";
import {NextObserver, Subscription} from "rxjs"


type GamePageState = {
    roomID: string | null
    fullscreen?: boolean
    navShown?: boolean
}

export default class GamePage extends React.Component<any, GamePageState> {
    static contextType = ApiContext;
    context!: AppAPI
    state: GamePageState = {
        roomID: null
    }

    constructor(props: any) {
        super(props);


        this.leftLobbyHandler = this.leftLobby.bind(this)
        this.joinedLobbyHandler = this.joinedLobby.bind(this)
    }

    leftLobbyHandler: () => void
    joinedLobbyHandler: () => void
    fullscreenSubscription?: Subscription

    componentDidMount() {
        this.context.addListener('leftLobby', this.leftLobbyHandler)
        this.context.addListener('joinedLobby', this.joinedLobbyHandler)
        this.fullscreenSubscription = UIContext.fullscreen.subscribe(this.onFullscreenChange.bind(this))
    }

    componentWillUnmount() {
        this.context.removeListener('leftLobby', this.leftLobbyHandler)
        this.context.removeListener('joinedLobby', this.joinedLobbyHandler)
        this.fullscreenSubscription?.unsubscribe()
    }

    onFullscreenChange(v: boolean) {
        this.setState({
            fullscreen: v
        })
    }

    render() {
        return <div className={`${styles.root} ${this.state.fullscreen ? styles.fullscreen : ''}`}>
            <nav className={this.state.navShown ? styles.shown : ''}>
                <button className={styles.navToggle} />
                <Brand  />

                <ul>
                    <li>
                        <NavLink exact to={this.props.match.url} activeClassName={styles.active}>
                            Play
                        </NavLink>
                    </li>
                    <li style={this.state.roomID ? {} : {display: 'none'}}>
                        <NavLink to={`${this.props.match.url}/room/${this.state.roomID}`} activeClassName={styles.active}>
                            Room
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to={`${this.props.match.url}/settings`} activeClassName={styles.active}>
                            Settings
                        </NavLink>
                    </li>
                    <li>
                        <NavLink to={`${this.props.match.url}/about`} activeClassName={styles.active}>
                            About
                        </NavLink>
                    </li>
                </ul>
            </nav>

            <div className={styles.body}>

                <Route exact path={this.props.match.path + '/room/:id'} component={RoomPage} />
                <Route exact path={this.props.match.path + '/settings'} component={SettingsPage} />
                <Route exact path={this.props.match.path} component={PlayPage} />

            </div>
        </div>
    }

    private leftLobby() {
        console.log('left room')
        this.setState({
            roomID: null
        })
    }

    private joinedLobby() {
        console.log('joined')
        this.setState({
            roomID: this.context.lobbyID
        })
        this.props.history.push(this.props.match.url + '/room/' + this.context.lobbyID)
    }
}