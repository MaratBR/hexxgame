import React from "react"
import {Redirect} from "react-router-dom"
import Loading from "../components/Loading";
import ApiContext from "../game/context";
import AppAPI from "../game/AppAPI";
import styles from "./WelcomePage.module.scss"
import Brand from "../components/Brand";

type WelcomeState = {
    loggedIn: boolean,
    loading: boolean,
    loggingIn?: boolean
    registered?: boolean
}

class WelcomePage extends React.Component<any, WelcomeState> {
    static contextType = ApiContext
    context!: AppAPI

    state: WelcomeState = {
        loggedIn: false,
        loading: true
    }

    async componentDidMount() {
        this.setState({
            loading: false,
            loggedIn: await this.context.isAuthorized()
        })
    }

    render() {

        if (this.state.loading)
            return <Loading fixed={true} />

        if (this.state.loggedIn)
            return <Redirect to='/game' />

        return <div className={styles.root}>
            <div className={styles.hexx}>
                <Brand />
                <span className={styles.quote}>Now with colors!</span>
            </div>
            <div className={styles.border} />
            <div className={styles.login}>
                <button className="button" onClick={() => this.loginAsAnon()}>
                    Login as anon
                </button>
            </div>
        </div>
    }

    private async loginAsAnon() {
        if (this.state.loggingIn)
            return
        this.setState({
            loggingIn: true
        })

        try {
            await this.context.authenticateAnon()
            this.setState({
                loggedIn: true
            })
        } catch (e) {

        } finally {
            this.setState({
                loggingIn: false
            })
        }
    }
}


export default WelcomePage