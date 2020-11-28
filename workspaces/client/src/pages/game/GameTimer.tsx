import React from "react";
import pretty from "pretty-ms"

type Props = {
    endsAt: number
}

type State = {
    pretty: string
    secondsRemain: number,
    interval?: NodeJS.Timeout
}

export default class GameTimer extends React.Component<Props, State> {
    state: State = {
        pretty: '',
        secondsRemain: 0
    }

    componentDidMount() {
        this.setState({
            interval: setInterval(this.tick.bind(this), 1000)
        })
    }

    tick() {
        this.setState({
            secondsRemain: this.state.secondsRemain-1,
            pretty: pretty(this.state.secondsRemain*1000-1000)
        })
    }

    componentWillUnmount() {
        if (this.state.interval)
            clearInterval(this.state.interval)
    }

    render() {
        return <div>{this.state.pretty}</div>
    }
}