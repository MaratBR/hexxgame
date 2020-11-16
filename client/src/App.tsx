import React from 'react';
import './App.scss';
import {BrowserRouter, Route} from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import GamePage from "./pages/GamePage";

function App() {

    return (
        <BrowserRouter>
            <Route exact path='/' component={WelcomePage} />
            <Route path='/game' component={GamePage} />
        </BrowserRouter>
    );
}

export default App;
