export const GAME_ROUTE = '/game'
export const ROOM_ROUTE = GAME_ROUTE + '/room/:id'
export const ROOM_MATCH_ROUTE = ROOM_ROUTE + '/match'
export const MATCH_ROUTE = '/archive/match/:id'
export const PROFILE_ROUTE = '/u/:id'

export function makeRoute(route: string, params: {[key: string]: any}) {
    for (let k in params) {
        if (params.hasOwnProperty(k))
            route = route.replace(':' + k, params[k]?.toString())
    }
    return route
}