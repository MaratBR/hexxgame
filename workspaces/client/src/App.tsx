import React from 'react';
import './App.scss';
import {BrowserRouter, Route} from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import GamePage from "./pages/GamePage";
import Overlay from "./Overlay";
import * as PIXI from "pixi.js"
import OAuthDonePage from "./pages/OAuthDonePage";
import UserProfile from "./pages/UserProfile";

function App() {

    return (
        <div>
            <BrowserRouter>
                <Route exact path='/' component={WelcomePage} />
                <Route path='/game' component={GamePage} />
                <Route path='/oauth' component={OAuthDonePage} />
                <Route path='/u/:id' component={UserProfile} />
            </BrowserRouter>

            <Overlay />
        </div>
    );
}

;(function() {
    PIXI.settings.FAIL_IF_MAJOR_PERFORMANCE_CAVEAT = false
})()

export default App;
