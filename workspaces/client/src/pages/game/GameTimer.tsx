import React from "react";
import pretty from "pretty-ms"
import Timer from "react-compound-timer"

type Props = {
    endsAt: number
}

type State = {
    pretty: string
    secondsRemain: number,
    interval?: NodeJS.Timeout
}

export default class GameTimer extends React.Component<Props, any> {

    shouldComponentUpdate(nextProps: Readonly<Props>, nextState: Readonly<any>, nextContext: any): boolean {
        return nextProps.endsAt !== this.props.endsAt
    }

    render() {
        return <Timer initialTime={this.props.endsAt - +new Date()} direction="backward">
            <Timer.Minutes />:<Timer.Seconds />
        </Timer>
    }
}