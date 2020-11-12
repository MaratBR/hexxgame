import {testApp} from "./app";
import {io, Socket} from "socket.io-client"

describe('socketio.io', () => {
    let c: Socket

    beforeAll(testApp.run)
    afterAll(testApp.stop)

    beforeEach(() => {
        c = io()
    })

    it('should', function () {

    });

})