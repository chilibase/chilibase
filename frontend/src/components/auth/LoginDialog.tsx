import React from 'react';
import {Dialog} from "primereact/dialog";
import type {AuthSession} from "./AuthSession";
import {LoginForm} from "./LoginForm";

// is used by local auth
// maybe is used in project kvm
// TODO - replace setAuthSession with onLogin(username: string, accessToken: string) and call this props.onLogin form onLogin
export const LoginDialog = (props: {dialogOpened: boolean; setAuthSession: (authSession: AuthSession | null) => void; onHideDialog: (ok: boolean) => void; customUserService?: string;}) => {

    // without this method, when opening the dialog again it would keep the original values
    const onShow = () => {
    }

    const onLogin = (username: string, accessToken: string) => {
        props.onHideDialog(true);
    }

    // note: rendering of the inner components of the Dialog is called only after the dialog is opened
    return (
        <Dialog visible={props.dialogOpened} onShow={onShow} onHide={() => props.onHideDialog(false)}>
            <LoginForm onLogin={onLogin} customUserService={props.customUserService}/>
        </Dialog>
    );
}
