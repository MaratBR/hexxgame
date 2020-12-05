import {Subscription} from "rxjs";

export default class Scope {
    private readonly teardownFunctions: (() => Promise<void> | void)[]

    constructor() {
        this.teardownFunctions = []
    }

    add(...callable: (() => Promise<void> | void)[]) {
        this.teardownFunctions.push(...callable)
    }

    addSubscription(...subscriptions: Subscription[]) {
        this.add(...subscriptions.map(sub => () => sub.unsubscribe()))
    }

    reset() {
        this.teardownFunctions.forEach(fn => {
            try {
                const result = fn()
                if (result instanceof Promise)
                    result.catch(console.error)
            } catch (e) {
                console.error(e)
            }
        })
        this.teardownFunctions.splice(0, this.teardownFunctions.length)
    }

    getChild() {
        const scope = new Scope()
        this.add(scope.reset.bind(scope))
        return scope
    }
}