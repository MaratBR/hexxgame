import moment from "moment";
import config from "../config";
import {UserModel} from "../models/User";
import Bull, {DoneCallback, Job} from "bull";

export const matchesQueue = new Bull<{matchId: string}>('matches')
export const jobs = new Bull('scheduled', {})

jobs.add('delete old users', null, {
    delay: 100,
    repeat: {
        every: 1000 * 60 * 60 * 24
    }
})

jobs.process('delete old users', (job: Job, done: DoneCallback) => {
    UserModel.deleteMany({
        isAnon: true,
        createdAt: {$lte: moment().subtract(3, 'weeks').toDate()}
    }, done)
})