import type { ApiClient } from './client';
import type {
  ApiResponse,
  InboxThreadItem,
  InboxMessageItem,
  InboxUnreadSummary,
  SendInboxMessageDto,
  CreateSupportThreadDto,
  OrderMessageAttachmentDto
} from '@bizx/common-types';

export class InboxModule {
  constructor(private client: ApiClient) {}

  async getThreads(): Promise<ApiResponse<InboxThreadItem[]>> {
    return this.client.get<ApiResponse<InboxThreadItem[]>>('/inbox/threads');
  }

  async getUnreadSummary(): Promise<ApiResponse<InboxUnreadSummary>> {
    return this.client.get<ApiResponse<InboxUnreadSummary>>('/inbox/unread-summary');
  }

  async getMessages(threadId: string): Promise<ApiResponse<InboxMessageItem[]>> {
    return this.client.get<ApiResponse<InboxMessageItem[]>>(`/inbox/threads/${threadId}/messages`);
  }

  async markRead(threadId: string): Promise<ApiResponse<{ updated: number }>> {
    return this.client.post<ApiResponse<{ updated: number }>>(
      `/inbox/threads/${threadId}/read`,
      {}
    );
  }

  async sendMessage(
    threadId: string,
    dto: SendInboxMessageDto
  ): Promise<ApiResponse<InboxMessageItem>> {
    return this.client.post<ApiResponse<InboxMessageItem>>(
      `/inbox/threads/${threadId}/messages`,
      dto
    );
  }

  async createSupportThread(dto: CreateSupportThreadDto): Promise<ApiResponse<InboxThreadItem>> {
    return this.client.post<ApiResponse<InboxThreadItem>>('/inbox/threads/support', dto);
  }

  async uploadAttachment(
    threadId: string,
    fileOrFormData: unknown
  ): Promise<ApiResponse<OrderMessageAttachmentDto>> {
    let body: unknown;
    if (typeof FormData !== 'undefined' && fileOrFormData instanceof FormData) {
      body = fileOrFormData;
    } else if (typeof FormData !== 'undefined') {
      const fd = new FormData();
      fd.append('file', fileOrFormData as any);
      body = fd;
    } else {
      body = fileOrFormData;
    }
    return this.client.post<ApiResponse<OrderMessageAttachmentDto>>(
      `/inbox/threads/${threadId}/upload`,
      body
    );
  }
}
