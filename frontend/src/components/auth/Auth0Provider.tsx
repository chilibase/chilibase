import React, {ReactNode, useState} from 'react';
import {Auth0Provider as Auth0Auth0Provider, useAuth0} from "@auth0/auth0-react";
import { XUtils } from '../XUtils';
import { XEnvVar } from '../XEnvVars';
import {UserNotFoundOrDisabledError} from "./UserNotFoundOrDisabledError";
import {PostLoginRequest, PostLoginResponse} from "../../common/auth-api";
import {XUtilsMetadata} from "../XUtilsMetadata";

export const Auth0Provider = ({children}: {children: ReactNode;}) => {
    // na fungovanie klienta stacili domain, clientId, redirectUri - tak som nechal len tie
    // a este som sem pridal audience (id-cko backend-u) aby pri prihlasovani pytal suhlas na scope "profile"
    // (bez toho pri getAccessTokenSilently vrati chybu "Consent required", v doku sa pise: user cannot provide consent during a non-interactive flow (like getAccessTokenSilently))
    // scope "profile" je pravdepodobne defaultny scope ktory sa vzdy vyzaduje
    // tu su dalsie atributy, ktore tu boli zapisane (audience, scope sa daju zapisat pri zavolani getAccessTokenSilently)
    // responseType="token id_token"
    // scope="openid profile admin:demo try:demo"
    // redirect_uri je url-ka, na ktoru sa flow vrati po logine z auth0.com (musi byt uvedena v configuracii aplikacie na auth0.com vo fielde Allowed Callback URLs)
    // (poznamka: mohli by sme pouzivat window.location.origin + "/callback" a na "/callback" v router-i zavesit specialny komponent ktory by sa cez navigate() dostal na spravnu stranku)
    //console.log('redirect_uri = ' + window.location.origin + window.location.pathname);
    return (
        <Auth0Auth0Provider
            domain={XUtils.getEnvVarValue(XEnvVar.VITE_AUTH0_DOMAIN)}
            clientId={XUtils.getEnvVarValue(XEnvVar.VITE_AUTH0_CLIENT_ID)}
            authorizationParams={{redirect_uri: window.location.origin, audience: XUtils.getEnvVarValue(XEnvVar.VITE_AUTH0_AUDIENCE)}}>
            <AppAuth0>
                {children}
            </AppAuth0>
        </Auth0Auth0Provider>
    );
}

function AppAuth0({children}: {children: ReactNode;}) {

    const {user, isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently} = useAuth0();

    const [initialized, setInitialized] = useState(false);

    // useEffect(() => {
    //     fetchAndSetXEntityMap();
    // },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const initializeApp = async () => {
        try {
            await setXTokenAndDoPostLogin();
            await fetchAndSetXMetadata();
            // vsetko zbehlo, app-ka je inicializovana
            setInitialized(true);
        }
        catch (err) {
            if (err instanceof UserNotFoundOrDisabledError) {
                // prihlasil sa napr. gmail user, ktory nie je uvedeny v DB
                // zrusime nastaveny access token
                XUtils.setXToken(null);
                // odhlasime uzivatela
                logout({logoutParams: {returnTo: window.location.origin}});
            }
            else {
                // ak bola ina chyba, aplikacia spadne
                throw err;
            }
        }
    }

    const setXTokenAndDoPostLogin = async () => {

        // const accessToken: string = await getAccessTokenSilently(/*{
        //     audience: Utils.getEnvVarValue(XEnvVar.VITE_AUTH0_AUDIENCE)
        //     //scope: "openid profile admin:demo try:demo" - treba nam na nieco?
        // }*/);

        // neviem ci tu je idealne miesto kde nastavit metodku getAccessToken, zatial dame sem
        XUtils.setXToken({accessToken: getAccessToken});

        // zavolame post-login
        // - overime ci je user zapisany v DB (toto sa da obist - TODO - poriesit)
        // - zosynchronizujeme zmeny (pre pripad ak sa zmenilo napr. Meno, Priezvisko) - TODO
        let xPostLoginResponse: PostLoginResponse;
        try {
            const xPostLoginRequest: PostLoginRequest = {username: user?.name};
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

        if (xPostLoginResponse.user === undefined) {
            // nenasli sme usera v DB
            alert(`User account "${user?.email}" not found in DB. Login not permitted. Ask admin to create user account in DB.`);
            // pouzijeme custom exception ktoru neskor odchytime (krajsie riesenie ako vracat true/false)
            throw new UserNotFoundOrDisabledError();
        }

        if (!xPostLoginResponse.user.enabled) {
            // user je disablovany
            alert(`User account "${user?.email}" is not enabled. Ask admin to enable user account.`);
            // pouzijeme custom exception ktoru neskor odchytime (krajsie riesenie ako vracat true/false)
            throw new UserNotFoundOrDisabledError();
        }

        // ulozime si usera do access token-u - zatial take provizorne, user sa pouziva v preSave na setnutie vytvoril_id
        XUtils.setXToken({
            accessToken: XUtils.getXToken()?.accessToken,
            user: xPostLoginResponse.user,
            logout: () => logout({logoutParams: {returnTo: window.location.origin}})
        });
    }

    const fetchAndSetXMetadata = async () => {
        await XUtilsMetadata.fetchAndSetXEntityMap();
        await XUtilsMetadata.fetchAndSetXBrowseMetaMap();
    }

    // tato funkcia sa vola pred kazdym requestom na backend - vola sa v metode XUtils.fetchBasic
    // ked sa vola len pri inicializacii, tak token po case (24h default) exspiruje a user si musi restartnut aplikaciu
    const getAccessToken = async (): Promise<string> => {

        return await getAccessTokenSilently(/*{
            audience: Utils.getEnvVarValue(XEnvVar.VITE_AUTH0_AUDIENCE)
            //scope: "openid profile admin:demo try:demo" - treba nam na nieco?
        }*/);
    }

    let elem: ReactNode;
    if (isLoading) {
        elem = <div className="App-form">User is being initialized using Auth0...</div>;
    }
    else {
        if (!isAuthenticated) {
            // otvori Auth0 prihlasovaciu stranku
            // window.location.pathname obsahuje path cast z volanej url-ky (napr. "/cars")
            // pri volani callback uri (navrat z auth0 do app-ky) zjavne automaticky pouzije tento ulozeny path
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
