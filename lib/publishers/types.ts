export type Provider = 'linkedin' | 'facebook' | 'instagram';

export interface PublishResult {
  postUrl?: string;
  externalId?: string;
}

export interface Publisher {
  provider: Provider;
  publish(userId: string, content: string, mediaUrl?: string): Promise<PublishResult>;
}

export class PublisherError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
