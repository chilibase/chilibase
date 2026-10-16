import React, {type ReactNode, useState} from 'react';
import {Auth0Provider as Auth0Auth0Provider, useAuth0} from "@auth0/auth0-react";
import { Utils } from '../../utils/Utils';
import { EnvVar } from '../env-vars/EnvVars';
import {UserNotFoundOrDisabledError} from "./UserNotFoundOrDisabledError";
import type {PostLoginRequest, PostLoginResponse} from "../../common/auth-api";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {useAuthSession} from "./useAuthSession";

// for localstorage, maybe we will use it in future
/*
// Auth0 stores the cache as @@auth0spajs@@::<clientId>::... with body.refresh_token.
function removeAuth0RefreshToken(): void {
    const prefix = "@@auth0spajs@@";
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key === null || !key.startsWith(prefix)) {
            continue;
        }
        const raw = localStorage.getItem(key);
        if (raw === null) {
            continue;
        }
        try {
            const entry = JSON.parse(raw);
            if (entry?.body?.refresh_token === undefined) {
                continue;
            }
            delete entry.body.refresh_token;
            localStorage.setItem(key, JSON.stringify(entry));
        }
        catch {
            // not an Auth0 cache entry
        }
    }
}
*/

export const Auth0Provider = ({children}: {children: ReactNode;}) => {
    // for the client to work, domain, clientId, redirectUri were enough - so I left only those
    // and I also added audience here (the id of the backend) so that during login it asks for consent for scope "profile"
    // (without that, getAccessTokenSilently returns the error "Consent required", the docs say: user cannot provide consent during a non-interactive flow (like getAccessTokenSilently))
    // scope "profile" is probably the default scope that is always required
    // here are further attributes that were written here (audience, scope can be written when calling getAccessTokenSilently)
    // responseType="token id_token"
    // scope="openid profile admin:demo try:demo"
    // redirect_uri is the url to which the flow returns after login from auth0.com (it must be listed in the application configuration on auth0.com in the field Allowed Callback URLs)
    // (note: we could use window.location.origin + "/callback" and on "/callback" in the router hang a special component that would get to the right page via navigate())
    //console.log('redirect_uri = ' + window.location.origin + window.location.pathname);
    return (
        <Auth0Auth0Provider
            domain={Utils.getEnvVarValue(EnvVar.VITE_AUTH0_DOMAIN)}
            clientId={Utils.getEnvVarValue(EnvVar.VITE_AUTH0_CLIENT_ID)}
            useRefreshTokens={true}
            cacheLocation="localstorage"
            authorizationParams={{redirect_uri: window.location.origin, audience: Utils.getEnvVarValue(EnvVar.VITE_AUTH0_AUDIENCE)}}>
            <AppAuth0>
                {children}
            </AppAuth0>
        </Auth0Auth0Provider>
    );
}

function AppAuth0({children}: {children: ReactNode;}) {

    const {setSession} = useAuthSession();

    const {user, isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently} = useAuth0();

    const [initialized, setInitialized] = useState(false);

    // useEffect(() => {
    //     fetchAndSetXEntityMap();
    // },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const initializeApp = async () => {
        try {
            await setAuthSessionAndDoPostLogin();
            await fetchAndSetXMetadata();
            // everything went through, the app is initialized
            setInitialized(true);
        }
        catch (err) {
            if (err instanceof UserNotFoundOrDisabledError) {
                // e.g. a gmail user who is not listed in the DB signed in
                // we clear the set access token
                setSession(null);
                // we log the user out
                logout({logoutParams: {returnTo: window.location.origin}});
            }
            else {
                // if there was another error, the application crashes
                throw err;
            }
        }
    }

    const setAuthSessionAndDoPostLogin = async () => {

        // const accessToken: string = await getAccessTokenSilently(/*{
        //     audience: Utils.getEnvVarValue(EnvVar.VITE_AUTH0_AUDIENCE)
        //     //scope: "openid profile admin:demo try:demo" - do we need it for something?
        // }*/);

        // I do not know if this is the ideal place to set the getAccessToken method, for now we put it here
        const accessToken: () => Promise<string> = getAccessToken;
        setSession({accessToken: accessToken});

        // we call x-post-login
        // - we check whether the user is written in the DB (this can be bypassed - TODO - deal with it)
        // - we synchronize changes (for the case that e.g. Meno, Priezvisko changed) - TODO
        let xPostLoginResponse: PostLoginResponse;
        try {
            const xPostLoginRequest: PostLoginRequest = {username: user?.name};
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
            alert(`User account "${user?.email}" not found in DB. Login not permitted. Ask admin to create user account in DB.`);
            // we use a custom exception that we catch later (a nicer solution than returning true/false)
            throw new UserNotFoundOrDisabledError();
        }

        if (!xPostLoginResponse.user.enabled) {
            // the user is disabled
            alert(`User account "${user?.email}" is not enabled. Ask admin to enable user account.`);
            // we use a custom exception that we catch later (a nicer solution than returning true/false)
            throw new UserNotFoundOrDisabledError();
        }

        // save the user to authSession (is used e.g. in preSave to set field modifUser)
        setSession({
            accessToken: accessToken,
            user: xPostLoginResponse.user,
            logout: () => logout({logoutParams: {returnTo: window.location.origin}})
        });
    }

    const fetchAndSetXMetadata = async () => {
        await UtilsMetadata.fetchAndSetXEntityMap();
        await UtilsMetadata.fetchAndSetXBrowseMetaMap();
    }

    // this function is called before every request to the backend - it is called in the method Utils.fetchBasic
    // if it is called only during initialization, the token expires after some time (24h default) and the user has to restart the application
    const getAccessToken = async (): Promise<string> => {

        const accessToken: string | undefined = await getAccessTokenSilently(/*{
            audience: Utils.getEnvVarValue(EnvVar.VITE_AUTH0_AUDIENCE)
            //scope: "openid profile admin:demo try:demo" - do we need it for something?
        }*/);
        if (accessToken === undefined) {
            throw new Error("Auth0 did not return an access token.");
        }
        return accessToken;
    }

    let elem: ReactNode;
    if (isLoading) {
        elem = <div className="App-form">User is being initialized using Auth0...</div>;
    }
    else {
        if (!isAuthenticated) {
            //removeAuth0RefreshToken();
            // opens the Auth0 login page
            // window.location.pathname contains the path part of the called url (e.g. "/cars")
            // when calling the callback uri (return from auth0 to the app) it apparently automatically uses this stored path
            loginWithRedirect({
                appState: { returnTo: window.location.pathname }
            });
            //elem = <div className="App-form"><button onClick={() => loginWithRedirect()}>Log In</button></div>;
        }
        else {
            if (!initialized) {
                elem = <div className="App-form">App is being initialized...</div>;
                initializeApp();
            }
            else {
                elem = children;
            }
        }
    }

    return elem;
}
