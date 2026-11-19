import type { ApiClient } from './client';
import type {
  ApiResponse,
  PermissionsResponse,
  RoleItem,
  CreateRoleDto,
  UpdateRoleDto,
  StoreMember,
  AddStoreMemberDto,
  UpdateStoreMemberDto,
  PlatformMember,
  AddPlatformMemberDto,
  UpdatePlatformMemberDto
} from '@bizx/common-types';

export interface PlatformUserListItem {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isPlatformStaff: boolean;
  platformRoleName: string | null;
  isBusinessOwner: boolean;
  storesCount: number;
  status: 'active' | 'suspended' | 'archived';
  subscriptionTier: string;
  subscriptionStatus: string;
  createdAt: string;
}

export class RbacModule {
  constructor(private client: ApiClient) {}

  // ==================== STORE RBAC ====================

  async getStorePermissions(storeId: string): Promise<ApiResponse<PermissionsResponse>> {
    return this.client.get<ApiResponse<PermissionsResponse>>(`/stores/${storeId}/permissions`);
  }

  async getStoreRoles(storeId: string): Promise<ApiResponse<RoleItem[]>> {
    return this.client.get<ApiResponse<RoleItem[]>>(`/stores/${storeId}/roles`);
  }

  async createStoreRole(storeId: string, dto: CreateRoleDto): Promise<ApiResponse<RoleItem>> {
    return this.client.post<ApiResponse<RoleItem>>(`/stores/${storeId}/roles`, dto);
  }

  async updateStoreRole(
    storeId: string,
    roleId: string,
    dto: UpdateRoleDto
  ): Promise<ApiResponse<RoleItem>> {
    return this.client.patch<ApiResponse<RoleItem>>(`/stores/${storeId}/roles/${roleId}`, dto);
  }

  async reorderStoreRoles(
    storeId: string,
    orderedRoleIds: string[]
  ): Promise<ApiResponse<RoleItem[]>> {
    return this.client.patch<ApiResponse<RoleItem[]>>(`/stores/${storeId}/roles/reorder`, {
      orderedRoleIds
    });
  }

  async archiveStoreRole(
    storeId: string,
    roleId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(
      `/stores/${storeId}/roles/${roleId}`
    );
  }

  async getStoreMembers(storeId: string): Promise<ApiResponse<StoreMember[]>> {
    return this.client.get<ApiResponse<StoreMember[]>>(`/stores/${storeId}/members`);
  }

  async addStoreMember(
    storeId: string,
    dto: AddStoreMemberDto
  ): Promise<ApiResponse<StoreMember>> {
    return this.client.post<ApiResponse<StoreMember>>(`/stores/${storeId}/members`, dto);
  }

  async updateStoreMember(
    storeId: string,
    memberId: string,
    dto: UpdateStoreMemberDto
  ): Promise<ApiResponse<StoreMember>> {
    return this.client.patch<ApiResponse<StoreMember>>(
      `/stores/${storeId}/members/${memberId}`,
      dto
    );
  }

  async removeStoreMember(
    storeId: string,
    memberId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(
      `/stores/${storeId}/members/${memberId}`
    );
  }

  // ==================== PLATFORM RBAC ====================

  async getPlatformPermissions(): Promise<ApiResponse<PermissionsResponse>> {
    return this.client.get<ApiResponse<PermissionsResponse>>('/platform/permissions');
  }

  async getPlatformRoles(): Promise<ApiResponse<RoleItem[]>> {
    return this.client.get<ApiResponse<RoleItem[]>>('/platform/roles');
  }

  async createPlatformRole(dto: CreateRoleDto): Promise<ApiResponse<RoleItem>> {
    return this.client.post<ApiResponse<RoleItem>>('/platform/roles', dto);
  }

  async updatePlatformRole(roleId: string, dto: UpdateRoleDto): Promise<ApiResponse<RoleItem>> {
    return this.client.patch<ApiResponse<RoleItem>>(`/platform/roles/${roleId}`, dto);
  }

  async reorderPlatformRoles(orderedRoleIds: string[]): Promise<ApiResponse<RoleItem[]>> {
    return this.client.patch<ApiResponse<RoleItem[]>>('/platform/roles/reorder', {
      orderedRoleIds
    });
  }

  async archivePlatformRole(roleId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(`/platform/roles/${roleId}`);
  }

  async getPlatformMembers(): Promise<ApiResponse<PlatformMember[]>> {
    return this.client.get<ApiResponse<PlatformMember[]>>('/platform/members');
  }

  async addPlatformMember(dto: AddPlatformMemberDto): Promise<ApiResponse<PlatformMember>> {
    return this.client.post<ApiResponse<PlatformMember>>('/platform/members', dto);
  }

  async updatePlatformMember(
    memberId: string,
    dto: UpdatePlatformMemberDto
  ): Promise<ApiResponse<PlatformMember>> {
    return this.client.patch<ApiResponse<PlatformMember>>(`/platform/members/${memberId}`, dto);
  }

  async removePlatformMember(memberId: string): Promise<ApiResponse<{ message: string }>> {
    return this.client.delete<ApiResponse<{ message: string }>>(`/platform/members/${memberId}`);
  }

  async getPlatformUsers(): Promise<ApiResponse<PlatformUserListItem[]>> {
    return this.client.get<ApiResponse<PlatformUserListItem[]>>('/platform/users');
  }

  async updatePlatformUserStatus(
    userId: string,
    status: 'active' | 'suspended' | 'archived'
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    return this.client.patch<ApiResponse<{ id: string; status: string }>>(
      `/platform/users/${userId}/status`,
      { status }
    );
  }
}
