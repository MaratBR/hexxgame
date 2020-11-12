export interface IManagerOptions {
    host: string,
    port: number
}

export default class Manager {
    private readonly address: string | undefined

    constructor(options: Partial<IManagerOptions>) {
        this.address = `${options.host || ''}:${options.port || 80}`
        this.address = this.address == ':80' ? undefined : this.address
    }


}