import {Injectable} from '@nestjs/common';
import {AuthGuard} from '@nestjs/passport';

// guard used (only) for login request - on login request is Local passport strategy applied (class LocalStrategy - verifying username/password)
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
