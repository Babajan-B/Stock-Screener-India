import { loadToken } from '../oauth';
import { Publisher, PublisherError, PublishResult } from './types';

export const facebookPublisher: Publisher = {
  provider: 'facebook',
  async publish(userId: string, content: string): Promise<PublishResult> {
    const token = await loadToken(userId, 'facebook');
    if (!token) {
      throw new PublisherError('not_connected', 'Facebook account is not connected.');
    }

    const params = new URLSearchParams({
      message: content,
      access_token: token.accessToken,
    });

    const res = await fetch(
      `https://graph.facebook.com/v19.0/${encodeURIComponent(token.accountId)}/feed`,
      { method: 'POST', body: params }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new PublisherError('facebook_api', `Facebook publish failed (${res.status}): ${text}`);
    }

    const json = (await res.json()) as { id?: string; post_id?: string };
    const externalId = json.post_id || json.id;
    return {
      externalId,
      postUrl: externalId ? `https://www.facebook.com/${externalId}` : undefined,
    };
  },
};
