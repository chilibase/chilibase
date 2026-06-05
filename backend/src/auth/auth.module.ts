import {DynamicModule, Module} from "@nestjs/common";
import {JwtStrategy} from "./jwt.strategy.js";
import {JwtModule} from "@nestjs/jwt";
import {LocalStrategy} from "./local.strategy.js";
import {LocalAuthService} from "./local-auth.service.js";
import {Utils} from "../utils/Utils.js";
import {Auth, EnvVar} from "../env-vars/EnvVars.js";

@Module({})
export class AuthModule {
    // we use the method forRoot() + DynamicModule in order to use env vars (config module must be created)
    static forRoot(): DynamicModule {

        return {
            imports: [
                // JwtModule is needed for JwtService (used in LocalAuthService)
                JwtModule.register({
                    secret: Utils.getEnvVarValue(EnvVar.X_AUTH) === Auth.LOCAL ? Utils.getEnvVarValue(EnvVar.X_AUTH_LOCAL_JWT_SECRET) : "dummy",
                    signOptions: { expiresIn: '180m' }, // TODO - shoud be 15m and implement refresh token with expiry 7d
                })
            ],
            providers: [JwtStrategy, LocalStrategy, LocalAuthService],
            exports: [LocalAuthService],
            module: AuthModule
        };
    }
}