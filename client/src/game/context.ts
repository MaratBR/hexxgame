import Manager from "./Manager";
import React from "react";

const manager = new Manager({
    host: 'localhost',
    port: 8000
})
const api = manager.API()
const ApiContext = React.createContext(api)

export default ApiContext