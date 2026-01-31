import { LogLevel } from "@azure/msal-browser";
import {Utils} from "../../utils/Utils.js";
import {XEnvVar, XViteAuth} from "../XEnvVars.js";

export let msalConfig;
export let loginRequest;
export let graphConfig;

export function initMsalConfig() {

    // first Utils.initLib must be called in order to call Utils.getEnvVarValue
    if (Utils.getEnvVarValue(XEnvVar.VITE_AUTH) === XViteAuth.MS_ENTRA_ID) {
        /**
         * Configuration object to be passed to MSAL instance on creation.
         * For a full list of MSAL.js configuration parameters, visit:
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md
         */
        msalConfig = {
            auth: {
                clientId: Utils.getEnvVarValue(XEnvVar.VITE_MS_ENTRA_ID_CLIENT_ID),
                authority: `https://login.microsoftonline.com/${Utils.getEnvVarValue(XEnvVar.VITE_MS_ENTRA_ID_TENANT_ID)}`,
                //redirectUri: "http://localhost:3000"
                // redirectUri will be url of the frontend application:
                redirectUri: window.location.origin + window.location.pathname
            },
            cache: {
                cacheLocation: "sessionStorage", // This configures where your cache will be stored
                storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
            },
            system: {
                loggerOptions: {
                    loggerCallback: (level, message, containsPii) => {
                        if (containsPii) {
                            return;
                        }
                        switch (level) {
                            case LogLevel.Error:
                                console.error(message);
                                return;
                            case LogLevel.Info:
                                // many log records (for every request), that's why turned off
                                //console.info(message);
                                return;
                            case LogLevel.Verbose:
                                console.debug(message);
                                return;
                            case LogLevel.Warning:
                                console.warn(message);
                                return;
                            default:
                                return;
                        }
                    }
                }
            }
        }

        /**
         * Scopes you add here will be prompted for user consent during sign-in.
         * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
         * For more information about OIDC scopes, visit:
         * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
         */
        loginRequest = {
            scopes: [Utils.getEnvVarValue(XEnvVar.VITE_MS_ENTRA_ID_BACKEND_SCOPE)]
        };

        /**
         * Add here the scopes to request when obtaining an access token for MS Graph API. For more information, see:
         * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/resources-and-scopes.md
         */
        graphConfig = {
            graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
        }
    }
}


// const msalConfig: Configuration = {
//     auth: {
//         clientId:  "76fdb3f1-03a7-4dcf-ae73-76f253e2e9a4",
//         authority: "https://login.microsoftonline.com/93f6b730-999f-48bf-8ec5-cf7d63eb7f60",
//         redirectUri: "http://localhost:3000",
//     },
//     cache: {
//         cacheLocation: 'localStorage', // or 'sessionStorage'
//     },
//     system: {
//         allowNativeBroker: true, // Disables native brokering support
//     }
// }
//
// const loginRequest = {
//     scopes: ['openid', 'profile', 'email'],
// };
