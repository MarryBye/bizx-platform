import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  ForbiddenException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@bizx/common-types';
import { ROLES_KEY } from '../decorators/auth.decorators.js';

interface AuthenticatedUser {
  sub: string;
  email: string;
  role: UserRole;
  name: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user || !user.role) {
      throw new ForbiddenException('Доступ запрещен: требуется авторизация');
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException('Недостаточно прав для выполнения операции');
    }

    return true;
  }
}
