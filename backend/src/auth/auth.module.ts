import {Module} from "@nestjs/common";
import {JwtStrategy} from "./jwt.strategy.js";

@Module({
    imports: [],
    providers: [JwtStrategy],
    exports: [],
})
export class AuthModule {}