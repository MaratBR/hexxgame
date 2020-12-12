import React, {useContext} from "react";
import styles from "./GoogleAuthButton.module.scss"
import googleIcon from "../assets/Google__G__Logo.svg"
import ApiContext from "../game/context";

export default function GoogleAuthButton() {
    const api = useContext(ApiContext)

    return <button className={styles.google} onClick={() => api.googleLogin()}>
        <img src={googleIcon} alt=""/>
        Sign in with Google
    </button>
}