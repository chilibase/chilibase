import {InputText} from "primereact/inputtext";
import React, {useState} from "react";
import {Password} from "primereact/password";
import {Button} from "primereact/button";
import {XUtils} from "../XUtils";
import {LocalAuthLoginRequest, LocalAuthLoginResponse, PostLoginRequest} from "../../common/auth-api";
import {XResponseError} from "../XResponseError";

// is used by local auth
export const LoginForm = (props: {
    onLogin: (username: string, accessToken: string) => void;
    customUserService?: string; // needed?
}) => {

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const onLogin = async () => {

        let xLocalAuthLoginResponse: LocalAuthLoginResponse;
        try {
            // object with properties username and password is processed by LocalStrategy -> they come into method LocalStrategy.validate
            const xLocalAuthLoginRequest: LocalAuthLoginRequest = {username: username, password: password};
            xLocalAuthLoginResponse = await XUtils.fetchOne('x-local-auth-login', xLocalAuthLoginRequest, false);
        }
        catch (e) {
            if (e instanceof XResponseError
                && (e as XResponseError).xResponseErrorBody.exceptionName === "UnauthorizedException") {
                alert("User authentication failed. Invalid username or password.");
            }
            else {
                // some other type of error
                const error: Error = e as Error;
                console.log(error.stack);
                // @ts-ignore
                console.log(error.cause);

                XUtils.showErrorMessage('User authentication failed.', e);
            }
            return; // we stay in form
        }

        props.onLogin(username, xLocalAuthLoginResponse.accessToken);

        // if (xUserAuthenticationResponse.authenticationOk) {
        //     //console.log("Autentifikacia uspesne zbehla");
        //     //console.log(xUserAuthenticationResponse.xUser);
        //     let customUser = undefined;
        //     if (props.customUserService) {
        //         customUser = await XUtils.fetchOne(props.customUserService, {username: username}, {username: username, password: password});
        //     }
        //     // zatial si ulozime len username/password (koli http basic autentifikacii)
        //     props.setXToken({username: username, password: password, xUser: customUser});
        //     // metoda pouzivana v LoginDialog
        //     if (props.onLogin) {
        //         props.onLogin();
        //     }
        // }
        // else {
        //     alert("Invalid Username/Password");
        // }
    }

    return (
        <div className="flex flex-column align-items-center">
            <h2>Please log in</h2>
            <div className="field grid">
                <label htmlFor="userName" className="col-fixed" style={{width:'10.5rem'}}>Username</label>
                <InputText id="userName" value={username} onChange={(e: any) => setUsername(e.target.value)} maxLength={64}/>
            </div>
            <div className="field grid">
                <label htmlFor="password" className="col-fixed" style={{width:'10.5rem'}}>Password</label>
                <Password id="password" value={password} onChange={(e: any) => setPassword(e.target.value)} feedback={false} maxLength={64}/>
            </div>
            <Button label="Log in" onClick={onLogin} />
        </div>
    );
}