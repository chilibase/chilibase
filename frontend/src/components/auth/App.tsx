import React, {ReactElement, ReactNode} from "react";
import {Auth0Provider} from "./Auth0Provider";
import {MSEntraIDProvider} from "./MSEntraIDProvider";
import {AuthOffProvider} from "./AuthOffProvider";
import {EnvVar, ViteAuth} from "../env-vars/EnvVars";
import { Utils } from "../../utils/Utils.js";
import {AuthLocalProvider} from "./AuthLocalProvider";

export const App = ({children}: {children: ReactNode;}) => {
    let elem: ReactElement;
    if (Utils.getEnvVarValue(EnvVar.VITE_AUTH) === ViteAuth.OFF) {
        elem = <AuthOffProvider>{children}</AuthOffProvider>;
    }
    else if (Utils.getEnvVarValue(EnvVar.VITE_AUTH) === ViteAuth.LOCAL) {
        elem = <AuthLocalProvider>{children}</AuthLocalProvider>;
    }
    else if (Utils.getEnvVarValue(EnvVar.VITE_AUTH) === ViteAuth.AUTH0) {
        elem = <Auth0Provider>{children}</Auth0Provider>;
    }
    else if (Utils.getEnvVarValue(EnvVar.VITE_AUTH) === ViteAuth.MS_ENTRA_ID) {
        elem = <MSEntraIDProvider>{children}</MSEntraIDProvider>;
    }
    else {
        throw `App: Authentication not implemented for VITE_AUTH = ${Utils.getEnvVarValue(EnvVar.VITE_AUTH)}`;
    }
    return (
        <div className="App">
            {elem}
        </div>
    );
}