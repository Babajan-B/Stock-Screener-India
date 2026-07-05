import { loadToken } from '../oauth';
import { Publisher, PublisherError, PublishResult } from './types';

export const linkedinPublisher: Publisher = {
  provider: 'linkedin',
  async publish(userId: string, content: string): Promise<PublishResult> {
    const token = await loadToken(userId, 'linkedin');
    if (!token) {
      throw new PublisherError('not_connected', 'LinkedIn account is not connected.');
    }

    const body = {
      author: `urn:li:person:${token.accountId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: content },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new PublisherError('linkedin_api', `LinkedIn publish failed (${res.status}): ${text}`);
    }

    const externalId = res.headers.get('x-restli-id') || undefined;
    return {
      externalId,
      postUrl: externalId ? `https://www.linkedin.com/feed/update/${externalId}` : undefined,
    };
  },
};
