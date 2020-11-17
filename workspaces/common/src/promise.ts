import { Duration } from "moment";

function ms(timeSpan: number | Duration): number {
    if (typeof timeSpan !== "number")
        timeSpan = timeSpan.asMilliseconds()
    return timeSpan
}

export function sleep(timeSpan: number | Duration) {
    return new Promise((resolve => {
        setTimeout(resolve, ms(timeSpan))
    }))
}

interface TimeoutPromiseResult<T> {
    result?: T
    error?: T
    took: number
    remaining: number
}

export function timeoutPromise<T>(promise: Promise<T>,
                           timeout: number | Duration,
                           timedOutCallback?: () => any): Promise<void | TimeoutPromiseResult<T>> {
    let finished = false
    const startsAt = +new Date()
    const timeoutPromise = sleep(timeout)
        .then(() => {
            if (!finished && timedOutCallback) {
                timedOutCallback()
            }
        })
    const result: TimeoutPromiseResult<T> = {
        took: 0,
        remaining: 0
    }
    const modifiedPromise = promise.then(d => {
        finished = true
        result.took = +new Date() - startsAt
        result.remaining = ms(timeout) - result.took
        result.result = d
        return result
    })
    return Promise.race([modifiedPromise, timeoutPromise])
}