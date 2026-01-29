import {User} from "./User.js";

export interface LocalAuthLoginRequest {
    username: string;
    password: string;
}

export interface LocalAuthLoginResponse {
    accessToken: string;
}

export interface PostLoginRequest {
    username?: string;
}

export interface PostLoginResponse {
    user?: User;
}
