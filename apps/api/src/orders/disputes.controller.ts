import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UsePipes
} from '@nestjs/common';
import { DisputesService } from './disputes.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  resolveDisputeDtoSchema,
  revokeStrikeDtoSchema,
  type ResolveDisputeDto,
  type RevokeStrikeDto,
  type PlatformDisputeListItem,
  type OrderDisputeItem,
  type StoreStrikeItem,
  type ApiResponse
} from '@bizx/common-types';

@Controller('platform')
@UseGuards(JwtAuthGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('disputes')
  async listDisputes(
    @CurrentUser('sub') userId: string,
    @Query('status') status?: string
  ): Promise<ApiResponse<PlatformDisputeListItem[]>> {
    const data = await this.disputesService.listPlatformDisputes(userId, status);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('disputes/summary')
  async getDisputesSummary(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ pendingEscalatedCount: number }>> {
    const data = await this.disputesService.getPlatformDisputesSummary(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('disputes/:disputeId')
  async getDisputeDetail(
    @Param('disputeId') disputeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<unknown>> {
    const data = await this.disputesService.getPlatformDisputeDetail(disputeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('disputes/:disputeId/resolve')
  @UsePipes(new ZodValidationPipe(resolveDisputeDtoSchema))
  async resolveDispute(
    @Param('disputeId') disputeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ResolveDisputeDto
  ): Promise<
    ApiResponse<{ dispute: OrderDisputeItem; strikeIssued: boolean; storeSuspended: boolean }>
  > {
    const data = await this.disputesService.resolvePlatformDispute(disputeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('stores/:storeId/strikes')
  async getStoreStrikes(
    @Param('storeId') storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreStrikeItem[]>> {
    const data = await this.disputesService.getStoreStrikes(storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('strikes/:strikeId/revoke')
  @UsePipes(new ZodValidationPipe(revokeStrikeDtoSchema))
  async revokeStrike(
    @Param('strikeId') strikeId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: RevokeStrikeDto
  ): Promise<ApiResponse<{ strike: StoreStrikeItem; storeSuspensionLifted: boolean }>> {
    const data = await this.disputesService.revokeStrike(strikeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
