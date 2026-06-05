import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {passportJwtSecret} from "jwks-rsa";
import {Auth, EnvVar} from "../env-vars/EnvVars.js";
import {Utils} from "../utils/Utils.js";

// parameter Strategy is from package 'passport-jwt'
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'x-jwt-strategy') {
    constructor() {
        if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.AUTH0) {
            super({
                secretOrKeyProvider: passportJwtSecret({
                    cache: true,
                    rateLimit: true,
                    jwksRequestsPerMinute: 5,
                    jwksUri: `https://${Utils.getEnvVarValue(EnvVar.X_AUTH0_DOMAIN)}/.well-known/jwks.json`,
                }),

                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                audience: Utils.getEnvVarValue(EnvVar.X_AUTH0_AUDIENCE),
                issuer: `https://${Utils.getEnvVarValue(EnvVar.X_AUTH0_DOMAIN)}/`,
                algorithms: ['RS256'],
            });
        }
        else if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.MS_ENTRA_ID) {
            super({
                secretOrKeyProvider: passportJwtSecret({
                    cache: true,
                    rateLimit: true,
                    jwksRequestsPerMinute: 5,
                    jwksUri: `https://login.microsoftonline.com/${Utils.getEnvVarValue(EnvVar.X_MS_ENTRA_ID_TENANT_ID)}/discovery/v2.0/keys`
                }),

                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                audience: Utils.getEnvVarValue(EnvVar.X_MS_ENTRA_ID_AUDIENCE),
                issuer: `https://login.microsoftonline.com/${Utils.getEnvVarValue(EnvVar.X_MS_ENTRA_ID_TENANT_ID)}/v2.0`,
                algorithms: ['RS256'],
            });
        }
        else if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.LOCAL) {
            super({
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                ignoreExpiration: false,
                secretOrKey: Utils.getEnvVarValue(EnvVar.X_AUTH_LOCAL_JWT_SECRET),
            });
        }
        else if (Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.OFF) {
            // when OFF then jwt strategy is not applied to any controller's endpoint
            // (in application in app.module.ts APP_GUARD is not added)
            // this constructor must be called otherwise the app crashes by start
            super({
                jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
                secretOrKey: "dummy",
            });
        }
        else {
            console.log(`JwtStrategy: authentication not implemented for X_AUTH = ${Utils.getEnvVarValue(EnvVar.X_AUTH)}`);
            throw `JwtStrategy: authentication not implemented for X_AUTH = ${Utils.getEnvVarValue(EnvVar.X_AUTH)}`;
        }
    }

    validate(payload: unknown): unknown {
        //console.log("JwtStrategy.validate payload = " + JSON.stringify(payload));
        return payload;
    }
}
