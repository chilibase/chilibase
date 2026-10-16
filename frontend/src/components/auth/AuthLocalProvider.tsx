import React, {type ReactNode, useState} from 'react';
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {LoginForm} from "./LoginForm";
import {Utils} from "../../utils/Utils";
import type {PostLoginRequest, PostLoginResponse} from "../../common/auth-api";
import {UserNotFoundOrDisabledError} from "./UserNotFoundOrDisabledError";
import {useAuthSession} from "./useAuthSession";

export const AuthLocalProvider = ({children}: {children: ReactNode;}) => {
    return (
        <AppAuthLocal>
            {children}
        </AppAuthLocal>
    );
}

function AppAuthLocal({children}: {children: ReactNode;}) {

    const {setSession} = useAuthSession();

    const [isAuthenticated, setAuthenticated] = useState(false);

    const [initialized, setInitialized] = useState(false);

    const onLogin = async (username: string, accessToken: string) => {
        await setAuthSessionAndDoPostLogin(username, accessToken);
        setAuthenticated(true);
    }

    const logout = () => {
        setSession(null);
        setAuthenticated(false);
        setInitialized(false);
    }

    // method is here to be similar to other auth methods (Auth0Provider, MSEntraIDProvider)
    // 'x-post-login' request can be united with 'x-local-auth-login' request in the LoginForm
    const setAuthSessionAndDoPostLogin = async (username: string, accessToken: string) => {

        // I do not know if this is the ideal place to set the getAccessToken method, for now we put it here
        setSession({accessToken: accessToken});

        // we call x-post-login
        // - we check whether the user is written in the DB (this can be bypassed - TODO - deal with it)
        // - we synchronize changes (for the case that e.g. Meno, Priezvisko changed) - TODO
        let xPostLoginResponse: PostLoginResponse;
        try {
            const xPostLoginRequest: PostLoginRequest = {username: username};
            xPostLoginResponse = await Utils.fetch('x-post-login', xPostLoginRequest);
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

            Utils.showErrorMessage('x-post-login failed', e);
            throw 'x-post-login failed';
        }

        if (xPostLoginResponse.user === undefined) {
            // we did not find the user in the DB
            alert(`User account "${username}" not found in DB. Login not permitted. Ask admin to create user account in DB.`);
            // we use a custom exception that we catch later (a nicer solution than returning true/false)
            throw new UserNotFoundOrDisabledError();
        }

        if (!xPostLoginResponse.user.enabled) {
            // the user is disabled
            alert(`User account "${username}" is not enabled. Ask admin to enable user account.`);
            // we use a custom exception that we catch later (a nicer solution than returning true/false)
            throw new UserNotFoundOrDisabledError();
        }

        // save the user to authSession (is used e.g. in preSave to set field modifUser)
        setSession({
            accessToken: accessToken,
            user: xPostLoginResponse.user,
            logout: logout
        });
    }

    const fetchAndSetXMetadata = async () => {
        await UtilsMetadata.fetchAndSetXEntityMap();
        await UtilsMetadata.fetchAndSetXBrowseMetaMap();
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
