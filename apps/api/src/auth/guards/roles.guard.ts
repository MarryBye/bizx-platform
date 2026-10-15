import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole, SystemRole } from '@bizx/common-types';
import { ROLES_KEY, PLATFORM_ADMIN_KEY } from '../decorators/auth.decorators.js';

interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
  systemRole: SystemRole;
  name: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPlatformAdminRequired = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (isPlatformAdminRequired) {
      if (!user || user.systemRole !== 'platform_admin') {
        throw new ForbiddenException('Доступ заборонено: потрібні права адміністратора платформи');
      }
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    if (!user || !user.role) {
      throw new ForbiddenException('Доступ заборонено: потрібна авторизація');
    }

    const hasRole = requiredRoles.includes(user.role) || user.systemRole === 'platform_admin';
    if (!hasRole) {
      throw new ForbiddenException('Недостатньо прав для виконання операції');
    }

    return true;
  }
}
