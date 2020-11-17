import React from 'react';
import './App.scss';
import {BrowserRouter, Route} from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import GamePage from "./pages/GamePage";
import Overlay from "./Overlay";

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

export default App;
