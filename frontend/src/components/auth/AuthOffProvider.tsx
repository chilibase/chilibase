import React, {type ReactNode, useState} from 'react';
import {Button} from "primereact/button";
import {UserNotFoundOrDisabledError} from "./UserNotFoundOrDisabledError";
import {Utils} from "../../utils/Utils";
import {EnvVar} from "../env-vars/EnvVars";
import type {PostLoginRequest, PostLoginResponse} from "../../common/auth-api";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {useAuthSession} from "./useAuthSession";

export const AuthOffProvider = ({children}: {children: ReactNode;}) => {
    return (
        <AppAuthOff>
            {children}
        </AppAuthOff>
    );
}

function AppAuthOff({children}: {children: ReactNode;}) {

    const {setSession} = useAuthSession();

    const [loggedIn, setLoggedIn] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // useEffect(() => {
    //     fetchAndSetXEntityMap();
    // },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const initializeApp = async () => {
        try {
            await getAndSetAccessToken();
            await fetchAndSetXMetadata();
            // everything went through, the app is initialized
            setInitialized(true);
        }
        catch (err) {
            if (err instanceof UserNotFoundOrDisabledError) {
                // e.g. a gmail user who is not listed in the DB signed in
            }
            else {
                // if there was another error, the application crashes
                throw err;
            }
        }
    }

    const getAndSetAccessToken = async () => {

        // TODO - provisional
        // Utils.getAccessToken() throws an error if accessToken is null
        // x-post-login needs accessToken, therefore we set it already here
        setSession({accessToken: 'dummy'});

        // we call x-post-login
        const username: string = Utils.getEnvVarValue(EnvVar.VITE_AUTH_OFF_USERNAME);
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

        // we store the user into the access token - for now provisional like this, the user is used in preSave to set vytvoril_id
        // TODO - here provisionally accessToken: 'dummy', it used to be accessToken: undefined
        setSession({accessToken: 'dummy', user: xPostLoginResponse.user, logout: logout});
        setLoggedIn(true);
    }

    const fetchAndSetXMetadata = async () => {
        await UtilsMetadata.fetchAndSetXEntityMap();
        await UtilsMetadata.fetchAndSetXBrowseMetaMap();
    }

    const logout = () => {
        setSession(null);
        setLoggedIn(false);
        setInitialized(false);
    }

    let elem;
    if (!loggedIn) {
        elem = <div className="App-form"><Button onClick={initializeApp}>Log In</Button></div>;
    }
    else {
        if (!initialized) {
            elem = <div className="App-form">App is being initialized...</div>;
        } else {
            elem = children;
        }
    }

    return elem;
}
