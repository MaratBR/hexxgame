import React from "react";
import {UserInfoDto} from "@hexx/common";
import ApiContext from "../game/context";
import AppAPI from "../game/AppAPI";
import ModalNotification from "../components/ModalNotification";
import Loading from "../components/Loading";
import styles from "./UserProfile.module.scss"
import {NavLink} from "react-router-dom";
import {Subject, Subscription} from "rxjs";
import {debounceTime, distinctUntilChanged} from "rxjs/operators";

type Props = {
    match: {
        params: {
            id: string
        }
    }
}

type State = {
    userInfo?: UserInfoDto
    error?: any
    enabledEditing?: boolean
    onSearch$: Subject<string>
    username?: string
}

export default class UserProfile extends React.Component<Props, State> {
    static contextType = ApiContext
    context!: AppAPI
    state: State = {
        onSearch$: new Subject<string>()
    }
    private sub?: Subscription

    componentWillUnmount() {
        this.sub?.unsubscribe()
    }

    async componentDidMount() {
        this.sub = this.state.onSearch$.pipe(
            debounceTime(500),
            distinctUntilChanged()
        ).subscribe(this.context.updateUsername.bind(this.context))

        try {
            const info = await this.context.getUserInfoById(this.props.match.params.id)
            this.setState({
                userInfo: info,
                username: info.username
            })

            if (!info.isAnon) {
                const currentUser = await this.context.getUserInfo()
                this.setState({
                    enabledEditing: currentUser.id === info.id
                })
            }
        } catch (e) {
            this.setState({error: e})
        }
    }

    render() {
        if (this.state.userInfo)
            return <div className={styles.profile}>
                <img className={styles.pic} src={this.state.userInfo.picUrl || `https://eu.ui-avatars.com/api/?name=${this.state.userInfo.username}`} alt=""/>
                <div className={styles.username}>
                    <input
                        onChange={v => {
                            const val = v.target.value.trim()
                            this.state.onSearch$.next(val)
                            this.setState({username: val})
                        }}
                        spellCheck="false"
                        value={this.state.username}
                        disabled={!this.state.enabledEditing} />
                    {this.state.userInfo.isAnon ? <small>Anonymous user</small> : undefined}
                </div>
                <div className={styles.stats}>
                    <b>Matches participated</b>: {this.state.userInfo.stats.matchesParticipated} <br/>
                    <b>Matches won</b>: {this.state.userInfo.stats.matchesWon} <br/>
                    <b>Moves performed</b>: {this.state.userInfo.stats.moves.total} <br/>
                    <b>Suicide moves</b>: {this.state.userInfo.stats.moves.suicide} <br/>
                    <b>"Tie" moves</b>: {this.state.userInfo.stats.moves.tie} <br/>
                    <b>Enemy cells captured</b>: {this.state.userInfo.stats.moves.capture} <br/>
                    <b>Neutral cells captured</b>: {this.state.userInfo.stats.moves.absorb} <br/>
                </div>
                <br/>
                <NavLink to="/" className="button">Back to main page</NavLink>
            </div>
        if (this.state.error)
            return <ModalNotification title="Error">{this.state.error.toString()}</ModalNotification>
        return <Loading type="spinner" />
    }
}