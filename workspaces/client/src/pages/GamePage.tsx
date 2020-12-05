import React from "react";
import styles from "./GamePage.module.scss"
import Brand from "../components/Brand";
import {Route, NavLink, Switch} from "react-router-dom";
import SettingsPage from "./game/SettingsPage";
import PlayPage from "./game/PlayPage";
import ApiContext from "../game/context";
import AppAPI from "../game/AppAPI";
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
            <div className={styles.body}>

                <Switch>
                    <Route path={this.props.match.path + '/room/:id'} component={GameCoordinatorPage} />
                    <Route exact path={this.props.match.path + '/settings'} component={SettingsPage} />
                    <Route exact path={this.props.match.path + ''} component={PlayPage} />
                </Switch>

            </div>
        </div>
    }

    private onRoomChanged(room?: Room<GameRoomState>) {
        this.setState({
            roomID: room?.id
        })
    }
}