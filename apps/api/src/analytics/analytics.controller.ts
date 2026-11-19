import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { RbacService } from '../rbac/rbac.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  analyticsQuerySchema,
  type AnalyticsQuery,
  type StoreAnalytics,
  type PlatformAnalytics,
  type UserRole,
  type SystemRole,
  type ApiResponse
} from '@bizx/common-types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly rbacService: RbacService
  ) {}

  @Get('stores/:storeId')
  async getStoreAnalytics(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @CurrentUser('systemRole') systemRole: SystemRole | undefined,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery
  ): Promise<ApiResponse<StoreAnalytics>> {
    const analytics = await this.analyticsService.getStoreAnalytics(
      storeId,
      userId,
      userRole,
      query,
      systemRole
    );
    return {
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    };
  }

  @Get('platform')
  async getPlatformAnalytics(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery
  ): Promise<ApiResponse<PlatformAnalytics>> {
    await this.rbacService.assertPlatformPermission(userId, 'platform.analytics.read');
    const analytics = await this.analyticsService.getPlatformAnalytics(query);
    return {
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    };
  }
}
