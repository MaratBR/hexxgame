import React from "react";
import AppAPI from "./AppAPI";

export const API_ADDRESS = 'http://localhost:8000'

const api = new AppAPI({
    address: /https?:\/\/.*/i.test(API_ADDRESS) ? API_ADDRESS.split('://', 2)[1] : API_ADDRESS,
    https: API_ADDRESS.startsWith('https://')
})
const ApiContext = React.createContext(api)

export default ApiContext
