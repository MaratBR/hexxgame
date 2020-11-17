import {
    BASE_LEN,
    EXPAND_LEN,
    Match,
    MatchModel,
    MAX_MINUTES,
    MAX_ROUNDS,
    MAX_VALUE,
    Participant
} from "../models/Match";
import {DoneCallback, Job} from "bull";
import moment from "moment";
import {EventEmitter} from "events";
import {Server} from "socket.io";
import {sleep, timeoutPromise} from "@hexx/common/src/promise";
import {UpdateQuery} from "mongoose";
import {DocumentType} from "@typegoose/typegoose";
import Dict = NodeJS.Dict;
import {User} from "../models/User";
import {MoveDirection} from "@hexx/common/src/dto";


interface IMatchExecutor {
    callback(job: Job<{matchId: string}>, done: DoneCallback): any
}

// i hate this
declare let _server: Server
type Namespace = ReturnType<typeof _server.of>

export class MatchExecutor implements IMatchExecutor {
    private readonly ns: Namespace
    private match: Match
    private readonly localEventEmitter: EventEmitter

    constructor(server: Server, matchId: string) {
        this.localEventEmitter = new EventEmitter()
        this.ns = server.of('match ' + matchId)
    }
    private localPlayersCache: Dict<Participant>

    get isPowerStage() { return this.match.state.roundStage == 2 }
    get isMoveStage() { return this.match.state.roundStage == 1 }

    skipRound() {
        this.localEventEmitter.emit('skip')
    }

    /**
     * Матч, сохраненный в памяти
     */
    get storedMatch() { return this.match }

    /**
     * Имя комнаты, в которой оперирует MatchExecutor
     */
    get roomName() { return 'R ' + this.storedMatch.roomId }

    /**
     * Текущая команда, если матч еще не начался возвращает 0
     */
    get currentTeam() { return this.match.state.team }

    /**
     * Текущая стадия раунда, если матч уже начался
     */
    get roundStage() { return this.match.state.roundStage }

    /**
     * Загрузить матч
     */
    async loadMatch(): Promise<Match> {
        // TODO: fix possible null returned by findById
        this.match = await MatchModel.findById(this.match._id)
        this.localPlayersCache = {}
        for (let p of this.match.participants)
            this.localPlayersCache[p.id] = p
        return this.match
    }

    onUserLeave(userID: string) {
        const participant = this.localPlayersCache[userID]
        if (participant && participant.online) {
            this.localPlayersCache[userID].online = false
            setTimeout(() => {
                if (!this.localPlayersCache[userID].online) {
                    this.notifyUserLeft(userID)
                }
            }, 2000)
        }
    }

    onUserJoin(userID: string) {
        const participant = this.localPlayersCache[userID]
        if (participant && !participant.online) {
            this.localPlayersCache[userID].online = true
            setTimeout(() => {
                if (this.localPlayersCache[userID].online) {
                    this.notifyUserJoined(userID)
                }
            }, 2000)
        }
    }

    private notifyUserLeft(userID: string) {
        this.ns.emit('user_left', {id: userID})
    }

    private notifyUserJoined(userID: string) {
        this.ns.emit('user_join', {id: userID})
    }

    private calculateRoundLength(): number {
        if (this.match.state.team < 1)
            return 0
        const cellsCount = this.match.getStats().teamPoints[this.match.state.team - 1]
        return (this.match.settings.baseLen || BASE_LEN) + (this.match.settings.expandLen || EXPAND_LEN) * cellsCount
    }

    private calculatePoints(): number {
        return Array.from(this.match.allCells())
            .filter(c => c.t == this.match.state.team)
            .length
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
        await this.updateMatch({jobId: job.id}, m => m.jobId = job.id)
        this.ns.emit('room_ready')
        await sleep(+this.match.startsAt - +new Date())

        // == add event handlers ==

        let winner: number = null

        while (winner == null) {
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

            let length = this.calculateRoundLength()
            this.ns.emit('round', {
                round: this.match.state.round,
                roundStage: 1,
                team: this.match.state.team,
                endsIn: moment().add(length, 'milliseconds').unix()
            })
            await this.updateMatch({
                $set: {
                    'state.roundStage': 1,
                    'state.round': this.match.state.round,
                    'state.team': this.match.state.team
                }
            })

            await this.expectEvent('skip', length)

            // == start second stage of the round ==

            this.match.state.roundStage = 2
            length = this.calculateRoundLength()
            this.match.state.powerPoints = this.calculatePoints()

            this.ns.emit('round', {
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

            this.ns.emit('round_stop')
            winner = this.match.getWinner()
        }

        this.ns.emit('')
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

    async attemptAttack(fromX: number, fromY: number, direction: MoveDirection) {
        this.match.attemptAttack(fromX, from)


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
        r = r || Math.abs(x1 - x2) == 1 && y2 == y1 + 1 - 2 * (x1 % 2)
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

    private async updateMatch(values: UpdateQuery<DocumentType<Match>>, setter?: (match: Match) => void) {
        if (setter)
            setter(this.match)
        await MatchModel.update({_id: this.match._id}, values).exec()
    }
}