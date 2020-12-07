import {Schema} from "@colyseus/schema"
import {NonFunctionPropNames} from "@colyseus/schema/lib/types/HelperTypes"

export function bindState<S1 extends Schema, S2>(state: S1, component: React.Component<any, S2>, key: NonFunctionPropNames<S1> & keyof S2) {
    return state.listen(key, value => {
        //@ts-ignore
        component.setState({
            [key]: value
        })
    })
}