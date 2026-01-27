import React, {ReactNode, useState} from 'react';
import {Button} from "primereact/button";
import {UserNotFoundOrDisabledError} from "./UserNotFoundOrDisabledError";
import {XUtils} from "../XUtils";
import {XEnvVar} from "../XEnvVars";
import {XPostLoginRequest} from "../../common/x-auth-api";
import {XUtilsMetadata} from "../XUtilsMetadata";

export const AuthOffProvider = ({children}: {children: ReactNode;}) => {
    return (
        <AppAuthOff>
            {children}
        </AppAuthOff>
    );
}

function AppAuthOff({children}: {children: ReactNode;}) {

    const [loggedIn, setLoggedIn] = useState(false);
    const [initialized, setInitialized] = useState(false);

    // useEffect(() => {
    //     fetchAndSetXEntityMap();
    // },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const initializeApp = async () => {
        try {
            await getAndSetAccessToken();
            await fetchAndSetXMetadata();
            // vsetko zbehlo, app-ka je inicializovana
            setInitialized(true);
        }
        catch (err) {
            if (err instanceof UserNotFoundOrDisabledError) {
                // prihlasil sa napr. gmail user, ktory nie je uvedeny v DB
            }
            else {
                // ak bola ina chyba, aplikacia spadne
                throw err;
            }
        }
    }

    const getAndSetAccessToken = async () => {

        // TODO - provizorne
        // XUtils.getAccessToken() vyhadzuje chybu ak je accessToken null
        // post-login potrebuje accessToken, preto ho uz tu setneme
        XUtils.setXToken({accessToken: 'dummy'});

        // zavolame post-login
        const username: string = XUtils.getEnvVarValue(XEnvVar.VITE_AUTH_OFF_USERNAME);
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
        // TODO - tu provizorne accessToken: 'dummy', bolo accessToken: undefined
        XUtils.setXToken({accessToken: 'dummy', xUser: xPostLoginResponse.xUser, logout: logout});
        setLoggedIn(true);
    }

    const fetchAndSetXMetadata = async () => {
        await XUtilsMetadata.fetchAndSetXEntityMap();
        await XUtilsMetadata.fetchAndSetXBrowseMetaMap();
    }

    const logout = () => {
        XUtils.setXToken(null);
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
