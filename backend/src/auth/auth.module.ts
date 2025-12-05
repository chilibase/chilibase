import {DynamicModule, Module} from "@nestjs/common";
import {JwtStrategy} from "./jwt.strategy.js";
import {JwtModule} from "@nestjs/jwt";
import {LocalStrategy} from "./local.strategy.js";
import {LocalAuthService} from "./local-auth.service.js";
import {XUtils} from "../services/XUtils.js";
import {XAuth, XEnvVar} from "../services/XEnvVars.js";

@Module({})
export class AuthModule {
    // we use the method forRoot() + DynamicModule in order to use env vars (config module must be created)
    static forRoot(): DynamicModule {

        return {
            imports: [
                // JwtModule is needed for JwtService (used in LocalAuthService)
                JwtModule.register({
                    secret: XUtils.getEnvVarValue(XEnvVar.X_AUTH) === XAuth.LOCAL ? XUtils.getEnvVarValue(XEnvVar.X_AUTH_LOCAL_JWT_SECRET) : "dummy",
                    signOptions: { expiresIn: '180m' }, // TODO - shoud be 15m and implement refresh token with expiry 7d
                })
            ],
            providers: [JwtStrategy, LocalStrategy, LocalAuthService],
            exports: [LocalAuthService],
            module: AuthModule
        };
    }
}