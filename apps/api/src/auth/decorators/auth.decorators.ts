import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { UserRole } from '@bizx/common-types';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const PLATFORM_ADMIN_KEY = 'isPlatformAdmin';
export const PlatformAdmin = () => SetMetadata(PLATFORM_ADMIN_KEY, true);

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  }
);
