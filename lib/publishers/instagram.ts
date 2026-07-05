import { decryptJson } from '../crypto';
import { getKv, kvKeys } from '../kv';
import { Publisher, PublisherError, PublishResult } from './types';

type IgCookie = { name: string; value: string; domain?: string; path?: string };

export const instagramPublisher: Publisher = {
  provider: 'instagram',
  async publish(userId: string, content: string, mediaUrl?: string): Promise<PublishResult> {
    const serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL;
    const serviceToken = process.env.PLAYWRIGHT_SERVICE_TOKEN;
    if (!serviceUrl || !serviceToken) {
      throw new PublisherError(
        'service_missing',
        'Playwright service (PLAYWRIGHT_SERVICE_URL / PLAYWRIGHT_SERVICE_TOKEN) is not configured.'
      );
    }

    const raw = await getKv().get<string>(kvKeys.userCookies(userId, 'instagram'));
    if (!raw) {
      throw new PublisherError(
        'not_connected',
        'Instagram session not captured. Run capture-session to log in.'
      );
    }
    const cookies = decryptJson<IgCookie[]>(raw);

    const res = await fetch(`${serviceUrl.replace(/\/$/, '')}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Token': serviceToken,
      },
      body: JSON.stringify({ userId, caption: content, mediaUrl, cookies }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new PublisherError(
        'playwright_service',
        `Instagram publish failed (${res.status}): ${text}`
      );
    }

    const json = (await res.json()) as { postUrl?: string; externalId?: string };
    return { postUrl: json.postUrl, externalId: json.externalId };
  },
};
