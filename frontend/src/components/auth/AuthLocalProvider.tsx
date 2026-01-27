import React, {ReactNode, useState} from 'react';
import {XUtilsMetadata} from "../XUtilsMetadata";
import {LoginForm} from "./LoginForm";
import {XUtils} from "../XUtils";
import {XPostLoginRequest} from "../../common/x-auth-api";
import {UserNotFoundOrDisabledError} from "./UserNotFoundOrDisabledError";

export const AuthLocalProvider = ({children}: {children: ReactNode;}) => {
    return (
        <AppAuthLocal>
            {children}
        </AppAuthLocal>
    );
}

function AppAuthLocal({children}: {children: ReactNode;}) {

    //const [xToken, setXToken] = useXToken(); - TODO - create hook that processes auth?
    const [isAuthenticated, setAuthenticated] = useState(false);

    const [initialized, setInitialized] = useState(false);

    const onLogin = async (username: string, accessToken: string) => {
        await setXTokenAndDoPostLogin(username, accessToken);
        setAuthenticated(true);
    }

    const logout = () => {
        XUtils.setXToken(null);
        setAuthenticated(false);
        setInitialized(false);
    }

    // method is here to be similar to other auth methods (Auth0Provider, MSEntraIDProvider)
    // 'post-login' request can be united with 'x-local-auth-login' request in the LoginForm
    const setXTokenAndDoPostLogin = async (username: string, accessToken: string) => {

        // neviem ci tu je idealne miesto kde nastavit metodku getAccessToken, zatial dame sem
        XUtils.setXToken({accessToken: accessToken});

        // zavolame post-login
        // - overime ci je user zapisany v DB (toto sa da obist - TODO - poriesit)
        // - zosynchronizujeme zmeny (pre pripad ak sa zmenilo napr. Meno, Priezvisko) - TODO
        let xPostLoginResponse;
        try {
            const xPostLoginRequest: XPostLoginRequest = {username: username};
            xPostLoginResponse = await XUtils.fetch('post-login', xPostLoginRequest);
        }
        catch (e) {
            // console.log(typeof e);
            // console.log(e instanceof Error);
            const error: Error = e as Error;
            // console.log(JSON.stringify(error));
            console.log(error.stack);
            // console.log(error.message);
            // console.log(error.name);
            // @ts-ignore
            console.log(error.cause);

            XUtils.showErrorMessage('post-login failed', e);
            throw 'post-login failed';
        }

        if (xPostLoginResponse.xUser === undefined) {
            // nenasli sme usera v DB
            alert(`User account "${username}" not found in DB. Login not permitted. Ask admin to create user account in DB.`);
            // pouzijeme custom exception ktoru neskor odchytime (krajsie riesenie ako vracat true/false)
            throw new UserNotFoundOrDisabledError();
        }

        if (!xPostLoginResponse.xUser.enabled) {
            // user je disablovany
            alert(`User account "${username}" is not enabled. Ask admin to enable user account.`);
            // pouzijeme custom exception ktoru neskor odchytime (krajsie riesenie ako vracat true/false)
            throw new UserNotFoundOrDisabledError();
        }

        // ulozime si usera do access token-u - zatial take provizorne, user sa pouziva v preSave na setnutie vytvoril_id
        XUtils.setXToken({
            accessToken: XUtils.getXToken()?.accessToken,
            xUser: xPostLoginResponse.xUser,
            logout: logout
        });
    }

    const fetchAndSetXMetadata = async () => {
        await XUtilsMetadata.fetchAndSetXEntityMap();
        await XUtilsMetadata.fetchAndSetXBrowseMetaMap();
        setInitialized(true);
    }

    let elem;
    if (!isAuthenticated) {
        elem = <div className="App-form"><LoginForm onLogin={onLogin}/></div>;
    }
    else {
        if (!initialized) {
            elem = <div className="App-form">App is being initialized...</div>;
            fetchAndSetXMetadata();
        }
        else {
            elem = children;
        }
    }

    return elem;
}
