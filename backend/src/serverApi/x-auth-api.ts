import {XUser} from "./XUser.js";

export interface XLocalAuthLoginRequest {
    username: string;
    password: string;
}

export interface XLocalAuthLoginResponse {
    accessToken: string;
}

export interface XPostLoginRequest {
    username?: string;
}

export interface XPostLoginResponse {
    xUser?: XUser;
}
