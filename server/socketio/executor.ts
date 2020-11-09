import {
    BASE_LEN,
    EXPAND_LEN,
    MapCellState,
    Match,
    MatchModel,
    MAX_MINUTES,
    MAX_ROUNDS,
    MAX_VALUE
} from "../models/match";
import {DoneCallback, Job} from "bull";
import moment from "moment";
import {sleep, timeoutPromise} from "";
import {EventEmitter} from "events";
import Dict = NodeJS.Dict;
import {Namespace} from "socket.io";

interface IMatchExecutor {
    callback(job: Job<{matchId: string}>, done: DoneCallback): any
}

export class MatchExecutor implements IMatchExecutor {
    private readonly ns: Namespace
    private match: Match
    private readonly localEventEmitter: EventEmitter
    constructor(ns: Namespace) {
        this.localEventEmitter = new EventEmitter()
    }

    get isPowerStage() { return this.match.state.roundStage == 2 }
    get isMoveStage() { return this.match.state.roundStage == 1 }

    skipRound() {
        this.localEventEmitter.emit('skip')
    }

    get storedMatch() { return this.match }

    get roomName() { return 'match ' + this.storedMatch._id }

    get currentTeam() { return this.match.state.team }

    get roundStage() { return this.match.state.roundStage }

    async loadMatch(): Promise<Match> {
        // TODO: fix possible null returned by findById
        this.match = await MatchModel.findById(this.match._id)
        return this.match
    }

    /**
     * Check is round is complete
     * @param match
     */
    private isMatchComplete(match: Match): boolean {
        const maxRounds = match.settings?.maxRounds || MAX_ROUNDS
        const maxMinutes = match.settings?.maxMinuted || MAX_MINUTES
        if (match.state.round >= maxRounds)
            return true

        if (maxMinutes > 0) {
            const endTime = moment(match.startsAt).add(maxMinutes, 'minutes')
            if (endTime.isBefore(moment()))
                return true
        }

        const matchCells = match.state.cells

        let winner: number | undefined
        let i = 0
        for (; i < matchCells.length && !winner; i++) {
            winner = matchCells[i].t
        }

        for (; i < matchCells.length; i++) {
            const t = matchCells[i].t
            if (t && t != winner)
                return false
        }
        return true
    }

    private calculateRoundLength(match: Match): number {
        const cellsCount = match.state.cells.filter(c => c.t == match.state.team).length
        return match.settings.baseLen || BASE_LEN + (match.settings.expandLen || EXPAND_LEN) * cellsCount
    }

    private calculatePoints(match: Match): number {
        return match.state.cells.filter(c => c.t == match.state.team).length
    }

    private async expectEvent<T>(name: string, timeout: number) {
        let resolveFn: (v: T) => any
        return timeoutPromise(
            new Promise<T>(resolve => {
                this.localEventEmitter.on(name, resolve)
                resolveFn = resolve
            }),
            timeout,
            () => resolveFn ? this.localEventEmitter.off(name, resolveFn) : undefined
        )
    }

    async callback(job: Job<{ matchId: string }>): Promise<any> {
        const matchId = job.data.matchId
        this.match = await MatchModel.findById(matchId)
        MatchModel.update({_id: matchId}, {jobId: job.id})

        const room = sioApp.to('match ' + matchId)
        room.emit('room_ready')
        await sleep(+this.match.startsAt - +new Date())

        // == add event handlers ==

        while (!this.isMatchComplete(this.match)) {
            if (this.match.state.team) {
                let index = this.match.teamsRotation.indexOf(this.match.state.team) + 1
                index = index == 0 || index >= this.match.teamsRotation.length ? 0 : index + 1
                this.match.state.team = this.match.teamsRotation[index]
            } else {
                this.match.state.team = this.match.teamsRotation[0]
            }

            // == start first stage of the round ==

            // increase counter
            this.match.state.roundStage = 1
            this.match.state.round++

            let length = this.calculateRoundLength(this.match)
            room.emit('round', {
                round: this.match.state.round,
                roundStage: 1,
                team: this.match.state.team,
                endsIn: moment().add(length, 'milliseconds').unix()
            })
            MatchModel.update({_id: matchId}, {
                $set: {
                    'state.roundStage': 1,
                    'state.round': this.match.state.round,
                    'state.team': this.match.state.team
                }
            })

            await this.expectEvent('skip', length)

            // == start second stage of the round ==

            this.match.state.roundStage = 2
            length = this.calculateRoundLength(this.match)
            this.match.state.powerPoints = this.calculatePoints(this.match)

            room.emit('round', {
                round: this.match.state.round,
                roundStage: 2,
                team: this.match.state.team,
                endsIn: moment().add(length, 'milliseconds').unix(),
                points: this.match.state.powerPoints
            })
            MatchModel.update({_id: matchId}, {
                $set: {
                    'state.roundStage': 2,
                    'state.powerPoints': this.match.state.powerPoints
                }
            })

            await this.expectEvent('skip', length)

            room.emit('round_stop')
        }
    }

    canBePoweredByTeam(cellIndex: number, team: number) {
        return cellIndex > 0 &&
            this.match.state.cells.length > cellIndex &&
            this.match.state.cells[cellIndex].t === team &&
            this.match.state.cells[cellIndex].v < (this.match.state.cells[cellIndex].mxv || MAX_VALUE)
    }

    async powerCell(index: number, maxOut: boolean) {
        if (this.match.state.cells.length > index && index >= 0) {
            const c = this.match.state.cells[index]
            const newValue = Math.min(maxOut ? (c.mxv || MAX_VALUE) : c.v + 1, c.v + this.match.state.powerPoints)
            this.ns.emit('power_up', {index, newValue: newValue, oldValue: c.v})
            this.match.state.powerPoints -= newValue - c.v
            c.v = newValue
            await MatchModel.update({
                _id: this.match._id
            }, {
                $set: {
                    ['state.cells.' + index + '.v']: c.v,
                    'state.powerPoints': this.match.state.powerPoints
                }
            })
        }

    }

    async attemptAttack(fromIndex: number, toIndex: number) {
        const cells = this.match.state.cells
        if (fromIndex < 0 || toIndex < 0 ||
            fromIndex >= cells.length ||
            toIndex >= cells.length ||
            fromIndex == toIndex) {
            return
        }

        const from = cells[fromIndex], to = cells[toIndex];
        if (!from.t || from.t == to.t || from.v < 2 ||
            !MatchExecutor.isNeighbour(cells[fromIndex].x, cells[toIndex].x, cells[fromIndex].y, cells[toIndex].y))
            return;

        // actual logic
        if (from.v <= to.v) {
            from.v = 1
            to.v -= from.v - 1
            await this.setValues([
                {i: fromIndex, v: from.v},
                {i: toIndex, v: to.v}
            ])
        } else {
            to.v = 1
            to.t = from.t
            to.v = from.v - 1
            from.v = 1

            await this.setValues([
                {i: fromIndex, v: from.v},
                {i: toIndex, v: to.v, t: from.t}
            ])
        }
    }

    static isNeighbour(x1: number, x2: number, y1: number, y2: number): boolean {
        let r = x1 == x2 && Math.abs(y1 - y2) == 1 || y1 == y2 && Math.abs(x1 - x2) == 1
        if (r)
            return r
        r ||= Math.abs(x1 - x2) == 1 && y2 == y1 + 1 - 2 * (x1 % 2)
        return r
    }

    private async setValues(values: {i: number, v: number, t?: number}[]) {
        this.ns.emit('upd', values)
        const update: Dict<any> = {}
        for (let v of values)
            update['state.cells.' + v.i + '.v'] = v.v
        await MatchModel.update({_id: this.match._id}, {
            $set: update
        })
    }
}