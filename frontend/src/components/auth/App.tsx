import React, {ReactElement, ReactNode} from "react";
import {Auth0Provider} from "./Auth0Provider";
import {MSEntraIDProvider} from "./MSEntraIDProvider";
import {AuthOffProvider} from "./AuthOffProvider";
import {XEnvVar, XViteAuth} from "../XEnvVars.js";
import { Utils } from "../../utils/Utils.js";
import {AuthLocalProvider} from "./AuthLocalProvider";

export const App = ({children}: {children: ReactNode;}) => {
    let elem: ReactElement;
    if (Utils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.OFF) {
        elem = <AuthOffProvider>{children}</AuthOffProvider>;
    }
    else if (Utils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.LOCAL) {
        elem = <AuthLocalProvider>{children}</AuthLocalProvider>;
    }
    else if (Utils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.AUTH0) {
        elem = <Auth0Provider>{children}</Auth0Provider>;
    }
    else if (Utils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.MS_ENTRA_ID) {
        elem = <MSEntraIDProvider>{children}</MSEntraIDProvider>;
    }
    else {
        throw `App: Authentication not implemented for VITE_AUTH = ${Utils.getEnvVarValue(XEnvVar.VITE_AUTH)}`;
    }
    return (
        <div className="App">
            {elem}
        </div>
    );
}