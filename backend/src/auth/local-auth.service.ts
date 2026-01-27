import {Injectable} from '@nestjs/common';
import {DataSource, SelectQueryBuilder} from "typeorm";
import {XUser} from "../administration/x-user.entity.js";
import {JwtService} from '@nestjs/jwt';
import {XLocalAuthLoginResponse} from "../common/x-auth-api.js";
import * as bcrypt from "bcrypt";

@Injectable()
export class LocalAuthService {

    constructor(
        private readonly dataSource: DataSource,
        private jwtService: JwtService
    ) {}

    async validateUser(username: string, password: string): Promise<XUser | null> {

        const repository = this.dataSource.getRepository(XUser);
        const selectQueryBuilder: SelectQueryBuilder<XUser> = repository.createQueryBuilder("xUser");
        selectQueryBuilder.where("xUser.username = :username", {username: username});
        const xUser: XUser | null = await selectQueryBuilder.getOne();
        if (xUser && await this.validatePassword(password, xUser.password)) {
            delete xUser.password; // remove password property from security reason
            return xUser;
        }
        return null;
    }

    async createJwtToken(user: XUser): Promise<XLocalAuthLoginResponse> {
        const payload = { username: user.username, sub: user.id };
        return {accessToken: this.jwtService.sign(payload)};
    }

    async changePassword(user: XUser, request: {passwordCurrent: string; passwordNew: string;}) {
        const repository = this.dataSource.getRepository(XUser);
        const selectQueryBuilder: SelectQueryBuilder<XUser> = repository.createQueryBuilder("xUser");
        selectQueryBuilder.where("xUser.username = :username", {username: user.username});
        const xUser: XUser = await selectQueryBuilder.getOneOrFail();
        // validate the current password
        if (!await this.validatePassword(request.passwordCurrent, xUser.password)) {
            throw "Current password invalid.";
        }

        xUser.password = await this.hashPassword(request.passwordNew);
        await repository.save(xUser);
    }

    async validatePassword(password: string | null, passwordDB: string | null): Promise<boolean> {
        let valid: boolean = false;
        if (password && passwordDB) {
            // if no encryption is used, trim is needed (in DB is CHAR, not VARCHAR)
            //valid = (password.trim() === passwordDB.trim());
            valid = await bcrypt.compare(password, passwordDB);
        }
        return valid;
    }

    hashPassword(password: string): Promise<string> {
        // standardne by mal byt saltOrRounds = 10, potom trva jeden vypocet asi 100 ms, co sa povazuje za dostatocne bezpecne proti utoku hrubou vypoctovou silou
        return bcrypt.hash(password, 10);
    }
}