import React, {type ReactNode, useState} from 'react';
import {
    type IMsalContext, MsalProvider,
    useIsAuthenticated,
    useMsal
} from "@azure/msal-react";
import {
    type AuthenticationResult,
    type IPublicClientApplication,
    type SilentRequest,
    type AccountInfo, PublicClientApplication,
} from "@azure/msal-browser";
import {loginRequest, msalConfig} from "./msalConfig";
import {Button} from "primereact/button";
import {UserNotFoundOrDisabledError} from "./UserNotFoundOrDisabledError";
import {Utils} from "../../utils/Utils";
import type {PostLoginRequest, PostLoginResponse} from "../../common/auth-api";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {useAuthSession} from "./useAuthSession";

export const MSEntraIDProvider = ({children}: {children: ReactNode;}) => {

    const msalInstance: PublicClientApplication = new PublicClientApplication(msalConfig);

    //console.log("check msalConfig.auth.redirectUri **************");
    //console.log(msalConfig.auth.redirectUri);

    return (
        <MsalProvider instance={msalInstance}>
            <AppMSEntraID>
                {children}
            </AppMSEntraID>
        </MsalProvider>
    );
}

function AppMSEntraID({children}: {children: ReactNode;}) {

    const {setSession} = useAuthSession();

    const isAuthenticated = useIsAuthenticated();
    const msalContext: IMsalContext = useMsal();
    const msalInstance: IPublicClientApplication = msalContext.instance;
    const accounts: AccountInfo[] = msalContext.accounts;

    const [initialized, setInitialized] = useState(false);

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
                //msalInstance.logoutRedirect();
                logoutWithRedirect();
            }
            else {
                // if there was another error, the application crashes
                throw err;
            }
        }
    }

    const setAuthSessionAndDoPostLogin = async () => {

        // I do not know if this is the ideal place to set the getAccessToken method, for now we put it here
        const accessToken: () => Promise<string> = getAccessToken;
        setSession({accessToken: accessToken});

        //const accountInfo = msalInstance.getActiveAccount();
        //const accountInfo = msalInstance.getAllAccounts()[0];
        const accountInfo = accounts[0];

        // we call x-post-login
        // - we check whether the user is written in the DB (this can be bypassed - TODO - deal with it)
        // - we synchronize changes (for the case that e.g. Meno, Priezvisko changed) - TODO
        let xPostLoginResponse: PostLoginResponse;
        try {
            const xPostLoginRequest: PostLoginRequest = {username: accountInfo?.username};
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
            alert(`User account "${accountInfo?.username}" not found in DB. Login not permitted. Ask admin to create user account in DB.`);
            // we use a custom exception that we catch later (a nicer solution than returning true/false)
            throw new UserNotFoundOrDisabledError();
        }

        if (!xPostLoginResponse.user.enabled) {
            // the user is disabled
            alert(`User account "${accountInfo?.username}" is not enabled. Ask admin to enable user account.`);
            // we use a custom exception that we catch later (a nicer solution than returning true/false)
            throw new UserNotFoundOrDisabledError();
        }

        // save the user to authSession (is used e.g. in preSave to set field modifUser)
        setSession({
            accessToken: accessToken,
            user: xPostLoginResponse.user,
            logout: logoutWithRedirect
        });
    }

    const fetchAndSetXMetadata = async () => {
        await UtilsMetadata.fetchAndSetXEntityMap();
        await UtilsMetadata.fetchAndSetXBrowseMetaMap();
    }

    const loginWithRedirect = async () => {

        try {
            await msalInstance.loginRedirect(loginRequest);
        }
        catch (err) {
            console.error('Error in loginWithRedirect: ', err);
            //alert(err);
            throw err;
        }
    }

    const logoutWithRedirect = async () => {
        const logoutRequest = {
            //account: msalInstance.getAccountByHomeId(homeAccountId),
            account: accounts[0],
            postLogoutRedirectUri: window.location.origin + window.location.pathname
        };
        await msalInstance.logoutRedirect(logoutRequest);
    }

    // this function is called before every request to the backend - it is called in the method Utils.fetchBasic
    // if it is called only during initialization, the token expires after 1 hour and the user has to restart the application
    // acquireTokenSilent obtains the token from sessionStorage (see msalConfig), if it expires after an hour, it obtains a new access token
    const getAccessToken = async (): Promise<string> => {

        const silentRequest: SilentRequest = {
            ...loginRequest,
            account: accounts[0],
        }

        //console.log("we are before msalInstance.acquireTokenSilent");
        const authenticationResult: AuthenticationResult = await msalInstance.acquireTokenSilent(silentRequest);

        return authenticationResult.accessToken;
    }

    let elem: ReactNode;
    // if (msalContext.inProgress) {
    //     elem = <div className="App-form">User is being initialized using Azure AD...</div>;
    // }
    // else {
        if (!isAuthenticated) {
            //if (msalInstance.getAllAccounts().length === 0) {
            //loginWithRedirect();
            elem = <div className="App-form"><Button onClick={loginWithRedirect}>Log In</Button></div>;
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
    // }

    return elem;
}
