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
import {Subscription} from "rxjs"
import {Room} from "colyseus.js";
import {GameRoomState} from "@hexx/common";
import {GameCoordinatorPage} from "./game/GameCoordinatorPage";


type GamePageState = {
    roomID?: string
    fullscreen?: boolean
    navShown?: boolean
}

export default class GamePage extends React.Component<any, GamePageState> {
    static contextType = ApiContext;
    context!: AppAPI
    state: GamePageState = {}

    constructor(props: any) {
        super(props)
    }

    private subs: Subscription[] = []

    componentDidMount() {
        this.subs.push(
            UIContext.fullscreen.subscribe(this.onFullscreenChange.bind(this)),
            this.context.roomSubject.subscribe(this.onRoomChanged.bind(this))
        )
    }

    componentWillUnmount() {
        this.subs.forEach(s => s.unsubscribe())
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

                <Route exact path={this.props.match.path + '/room/:id'} component={GameCoordinatorPage} />
                <Route exact path={this.props.match.path + '/settings'} component={SettingsPage} />
                <Route exact path={this.props.match.path} component={PlayPage} />

            </div>
        </div>
    }

    private onRoomChanged(room?: Room<GameRoomState>) {
        this.setState({
            roomID: room?.state.id
        })
    }
}