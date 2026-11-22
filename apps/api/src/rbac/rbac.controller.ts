import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards
} from '@nestjs/common';
import { RbacService } from './rbac.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/auth.decorators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SafeUuidPipe } from '../common/security/safe-uuid.pipe.js';
import {
  createRoleDtoSchema,
  updateRoleDtoSchema,
  reorderRolesDtoSchema,
  addStoreMemberDtoSchema,
  updateStoreMemberDtoSchema,
  addPlatformMemberDtoSchema,
  updatePlatformMemberDtoSchema,
  updatePlatformUserStatusDtoSchema,
  updatePlatformUserSubscriptionDtoSchema,
  type CreateRoleDto,
  type UpdateRoleDto,
  type ReorderRolesDto,
  type AddStoreMemberDto,
  type UpdateStoreMemberDto,
  type AddPlatformMemberDto,
  type UpdatePlatformMemberDto,
  type UpdatePlatformUserStatusDto,
  type UpdatePlatformUserSubscriptionDto,
  type ApiResponse,
  type RoleItem,
  type PermissionsResponse,
  type StoreMember,
  type PlatformMember
} from '@bizx/common-types';

@Controller()
@UseGuards(JwtAuthGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  // ==================== STORE RBAC (РОЛІ, ДОСТУПИ, КОМАНДА) ====================

  @Get('stores/:storeId/permissions')
  async getStorePermissions(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PermissionsResponse>> {
    const data = await this.rbacService.getPermissionsForStore(storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('stores/:storeId/roles')
  async getStoreRoles(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<RoleItem[]>> {
    const data = await this.rbacService.listRoles('store', storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/roles')
  async createStoreRole(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createRoleDtoSchema)) dto: CreateRoleDto
  ): Promise<ApiResponse<RoleItem>> {
    const data = await this.rbacService.createRole('store', storeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('stores/:storeId/roles/reorder')
  async reorderStoreRoles(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(reorderRolesDtoSchema)) dto: ReorderRolesDto
  ): Promise<ApiResponse<RoleItem[]>> {
    const data = await this.rbacService.reorderRoles('store', storeId, userId, dto.orderedRoleIds);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('stores/:storeId/roles/:roleId')
  async updateStoreRole(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @Param('roleId', SafeUuidPipe) roleId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateRoleDtoSchema)) dto: UpdateRoleDto
  ): Promise<ApiResponse<RoleItem>> {
    const data = await this.rbacService.updateRole('store', storeId, roleId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete('stores/:storeId/roles/:roleId')
  async archiveStoreRole(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @Param('roleId', SafeUuidPipe) roleId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.rbacService.archiveRole('store', storeId, roleId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('stores/:storeId/members')
  async getStoreMembers(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<StoreMember[]>> {
    const data = await this.rbacService.listStoreMembers(storeId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('stores/:storeId/members')
  async addStoreMember(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(addStoreMemberDtoSchema)) dto: AddStoreMemberDto
  ): Promise<ApiResponse<StoreMember>> {
    const data = await this.rbacService.addStoreMember(storeId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('stores/:storeId/members/:memberId')
  async updateStoreMember(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @Param('memberId', SafeUuidPipe) memberId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateStoreMemberDtoSchema)) dto: UpdateStoreMemberDto
  ): Promise<ApiResponse<StoreMember>> {
    const data = await this.rbacService.updateStoreMember(storeId, memberId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete('stores/:storeId/members/:memberId')
  async removeStoreMember(
    @Param('storeId', SafeUuidPipe) storeId: string,
    @Param('memberId', SafeUuidPipe) memberId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.rbacService.removeStoreMember(storeId, memberId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  // ==================== PLATFORM RBAC (РОЛІ, ДОСТУПИ, КОМАНДА BIZX) ====================

  @Get('platform/permissions')
  async getPlatformPermissions(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PermissionsResponse>> {
    const data = await this.rbacService.getPermissionsForPlatform(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('platform/roles')
  async getPlatformRoles(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<RoleItem[]>> {
    const data = await this.rbacService.listRoles('platform', null, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/roles')
  async createPlatformRole(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createRoleDtoSchema)) dto: CreateRoleDto
  ): Promise<ApiResponse<RoleItem>> {
    const data = await this.rbacService.createRole('platform', null, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('platform/roles/reorder')
  async reorderPlatformRoles(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(reorderRolesDtoSchema)) dto: ReorderRolesDto
  ): Promise<ApiResponse<RoleItem[]>> {
    const data = await this.rbacService.reorderRoles('platform', null, userId, dto.orderedRoleIds);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('platform/roles/:roleId')
  async updatePlatformRole(
    @Param('roleId', SafeUuidPipe) roleId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updateRoleDtoSchema)) dto: UpdateRoleDto
  ): Promise<ApiResponse<RoleItem>> {
    const data = await this.rbacService.updateRole('platform', null, roleId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete('platform/roles/:roleId')
  async archivePlatformRole(
    @Param('roleId', SafeUuidPipe) roleId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.rbacService.archiveRole('platform', null, roleId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('platform/members')
  async getPlatformMembers(
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<PlatformMember[]>> {
    const data = await this.rbacService.listPlatformMembers(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Post('platform/members')
  async addPlatformMember(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(addPlatformMemberDtoSchema)) dto: AddPlatformMemberDto
  ): Promise<ApiResponse<PlatformMember>> {
    const data = await this.rbacService.addPlatformMember(userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('platform/members/:memberId')
  async updatePlatformMember(
    @Param('memberId', SafeUuidPipe) memberId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updatePlatformMemberDtoSchema)) dto: UpdatePlatformMemberDto
  ): Promise<ApiResponse<PlatformMember>> {
    const data = await this.rbacService.updatePlatformMember(memberId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Delete('platform/members/:memberId')
  async removePlatformMember(
    @Param('memberId', SafeUuidPipe) memberId: string,
    @CurrentUser('sub') userId: string
  ): Promise<ApiResponse<{ message: string }>> {
    const data = await this.rbacService.removePlatformMember(memberId, userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('platform/stores')
  async getPlatformStores(@CurrentUser('sub') userId: string): Promise<ApiResponse<unknown[]>> {
    const data = await this.rbacService.listPlatformStores(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Get('platform/users')
  async getPlatformUsers(@CurrentUser('sub') userId: string): Promise<ApiResponse<unknown[]>> {
    const data = await this.rbacService.listPlatformUsers(userId);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('platform/users/:targetUserId/status')
  async updatePlatformUserStatus(
    @Param('targetUserId', SafeUuidPipe) targetUserId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updatePlatformUserStatusDtoSchema))
    dto: UpdatePlatformUserStatusDto
  ): Promise<
    ApiResponse<{
      id: string;
      status: string;
      suspendedUntil: string | null;
      suspensionReason: string | null;
    }>
  > {
    const data = await this.rbacService.updatePlatformUserStatus(targetUserId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }

  @Patch('platform/users/:targetUserId/subscription')
  async updatePlatformUserSubscription(
    @Param('targetUserId', SafeUuidPipe) targetUserId: string,
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(updatePlatformUserSubscriptionDtoSchema))
    dto: UpdatePlatformUserSubscriptionDto
  ): Promise<
    ApiResponse<{
      id: string;
      subscriptionTier: string;
      subscriptionStatus: string;
      subscriptionExpiresAt: string | null;
    }>
  > {
    const data = await this.rbacService.updatePlatformUserSubscription(targetUserId, userId, dto);
    return { success: true, data, timestamp: new Date().toISOString() };
  }
}
