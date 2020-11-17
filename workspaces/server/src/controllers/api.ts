type MessageResponse = {
    message: string
}

export function message(msg: string): MessageResponse {
    return {message: msg}
}
