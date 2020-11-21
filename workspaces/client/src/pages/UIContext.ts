import React from "react";
import {EventEmitter} from "events";
import {Subject} from "rxjs"

class UIState extends EventEmitter {
    public fullscreen = new Subject<boolean>()
}

const UIContext = new UIState()

export default UIContext