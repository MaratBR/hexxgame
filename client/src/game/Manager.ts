import AppAPI from "./AppAPI";

export interface IManagerOptions {
    host: string,
    port: number
}

export default class Manager {
    private readonly address: string

    constructor(options: Partial<IManagerOptions>) {
        this.address = options.host + ':' + (options.port || 80)
    }

    API(): AppAPI {
        return new AppAPI({address: this.address})
    }
}