import React from 'react';
import './App.scss';
import {BrowserRouter, Route} from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import GamePage from "./pages/GamePage";
import Overlay from "./Overlay";
import * as PIXI from "pixi.js"

function App() {

    return (
        <div>
            <BrowserRouter>
                <Route exact path='/' component={WelcomePage} />
                <Route path='/game' component={GamePage} />
            </BrowserRouter>

            <Overlay />
        </div>
    );
}

;(function() {
    PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false
})()

export default App;
