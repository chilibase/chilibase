import React, {ReactNode, useState} from 'react';
import useXToken from "../useXToken";
import {XUtilsMetadata} from "../XUtilsMetadata";
import {XLoginForm} from "../XLoginForm";

// TODO - does not work (very old code) - implement creating bearer token, use nestjs modul to process bearer token on backend
// - add logout

export const XAuthLocalProvider = ({children}: {children: ReactNode;}) => {
    return (
        <AppAuthLocal>
            {children}
        </AppAuthLocal>
    );
}

function AppAuthLocal({children}: {children: ReactNode;}) {

    const [xToken, setXToken] = useXToken();

    const [initialized, setInitialized] = useState(false);

    // useEffect(() => {
    //     fetchAndSetXEntityMap();
    // },[]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchAndSetXMetadata = async () => {
        await XUtilsMetadata.fetchAndSetXEntityMap();
        await XUtilsMetadata.fetchAndSetXBrowseMetaMap();
        setInitialized(true);
    }

    // const logout = () => {
    //     XUtils.setXToken(null);
    //     setInitialized(false);
    // }

    let elem;
    if (xToken === null) {
        elem = <div className="App-form"><XLoginForm setXToken={setXToken}/></div>;
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
