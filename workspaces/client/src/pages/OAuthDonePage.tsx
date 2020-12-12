import React from "react";
import Modal from "../components/Modal";
import query from 'querystring'
import Loading from "../components/Loading";

export default function OAuthDonePage(props: any) {
    const {modal} = query.decode(props.location.search ? props.location.search.substr(1) : '')
    if (modal === '1') {
        window.parent.close()
    }

    return <Loading type='spinner' />
}