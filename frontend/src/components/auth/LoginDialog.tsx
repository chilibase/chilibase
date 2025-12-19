import React from 'react';
import {Dialog} from "primereact/dialog";
import {XToken} from "../XToken";
import {LoginForm} from "./LoginForm";

// is used by local auth
// maybe is used in project kvm
// TODO - replace setXToken with onLogin(username: string, accessToken: string) and call this props.onLogin form onLogin
export const LoginDialog = (props: {dialogOpened: boolean; setXToken: (xToken: XToken | null) => void; onHideDialog: (ok: boolean) => void; customUserService?: string;}) => {

    // bez tejto metody by pri opetovnom otvoreni dialogu ponechal povodne hodnoty
    const onShow = () => {
    }

    const onLogin = (username: string, accessToken: string) => {
        props.onHideDialog(true);
    }

    // poznamka: renderovanie vnutornych komponentov Dialogu sa zavola az po otvoreni dialogu
    return (
        <Dialog visible={props.dialogOpened} onShow={onShow} onHide={() => props.onHideDialog(false)}>
            <LoginForm onLogin={onLogin} customUserService={props.customUserService}/>
        </Dialog>
    );
}
