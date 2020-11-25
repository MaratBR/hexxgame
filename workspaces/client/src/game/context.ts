import React from "react";
import AppAPI from "./AppAPI";

const api = new AppAPI({
    address: 'localhost:8000'
})
const ApiContext = React.createContext(api)

export default ApiContext
