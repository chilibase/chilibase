import {XUser} from "./XUser.js";

export interface XUserAuthenticationRequest {
    username: string;
    password: string;
}

export interface XUserAuthenticationResponse {
    authenticationOk: boolean;
    xUser?: XUser;
}
