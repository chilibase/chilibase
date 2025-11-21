import {XUser} from "./XUser";

// fieldy na sychronizaciu (zatial len username)

export interface XPostLoginRequest {
    username?: string;
}

export interface XPostLoginResponse {
    xUser?: XUser;
}
