import { SetMetadata } from '@nestjs/common';

// Public decorator - api methods marked with this decorator have authentication turned off - see JwtAuthGuard
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);