import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { CurrentUser, Roles } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  analyticsQuerySchema,
  type AnalyticsQuery,
  type StoreAnalytics,
  type PlatformAnalytics,
  type UserRole,
  type ApiResponse
} from '@bizx/common-types';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('stores/:storeId')
  @Roles('business_owner', 'admin')
  async getStoreAnalytics(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') userRole: UserRole,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery
  ): Promise<ApiResponse<StoreAnalytics>> {
    const analytics = await this.analyticsService.getStoreAnalytics(
      storeId,
      userId,
      userRole,
      query
    );
    return {
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    };
  }

  @Get('platform')
  @Roles('admin')
  async getPlatformAnalytics(
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery
  ): Promise<ApiResponse<PlatformAnalytics>> {
    const analytics = await this.analyticsService.getPlatformAnalytics(query);
    return {
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    };
  }
}
