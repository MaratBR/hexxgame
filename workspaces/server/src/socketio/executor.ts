import Dict = NodeJS.Dict;
import {MatchExecutor} from "./MatchExecutor";
import {Server} from "socket.io";

class ExecutorHub {
    private readonly executors: Dict<MatchExecutor> = {}

    getLocalExecutorOrNull(matchId: string): MatchExecutor | null {
        return this.executors[matchId] || null
    }

    createExecutorIfNotExists(io: Server, matchId: string): MatchExecutor {
        return this.executors[matchId] ? this.executors[matchId] :
            (this.executors[matchId] = new MatchExecutor(io, matchId))
    }
}

const executorHub = new ExecutorHub()

export default executorHub