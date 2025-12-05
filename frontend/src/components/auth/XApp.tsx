import React, {ReactElement, ReactNode} from "react";
import {XAuth0Provider} from "./XAuth0Provider";
import {XMSEntraIDProvider} from "./XMSEntraIDProvider";
import {XAuthOffProvider} from "./XAuthOffProvider";
import {XEnvVar, XViteAuth} from "../XEnvVars.js";
import { XUtils } from "../XUtils.js";
import {XAuthLocalProvider} from "./XAuthLocalProvider";

export const XApp = ({children}: {children: ReactNode;}) => {
    let elem: ReactElement;
    if (XUtils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.OFF) {
        elem = <XAuthOffProvider>{children}</XAuthOffProvider>;
    }
    else if (XUtils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.LOCAL) {
        elem = <XAuthLocalProvider>{children}</XAuthLocalProvider>;
    }
    else if (XUtils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.AUTH0) {
        elem = <XAuth0Provider>{children}</XAuth0Provider>;
    }
    else if (XUtils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.MS_ENTRA_ID) {
        elem = <XMSEntraIDProvider>{children}</XMSEntraIDProvider>;
    }
    else {
        throw `XApp: Authentication not implemented for VITE_AUTH = ${XUtils.getEnvVarValue(XEnvVar.VITE_AUTH)}`;
    }
    return (
        <div className="App">
            {elem}
        </div>
    );
}