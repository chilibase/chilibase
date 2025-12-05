import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import {LocalAuthService} from "./local-auth.service.js";

// parameter Strategy is from package 'passport-local'
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private localAuthService: LocalAuthService) {
        super();
    }

    async validate(username: string, password: string): Promise<any> {
        // this method is called on request 'x-local-auth-login' (controller method uses LocalAuthGuard)
        // passport framework puts the returned value (user) into "request.user" parameter and invokes the method of the controller
        const user = await this.localAuthService.validateUser(username, password);
        if (!user) {
            throw new UnauthorizedException();
        }
        return user;
    }
}