import { facebookPublisher } from './facebook';
import { instagramPublisher } from './instagram';
import { linkedinPublisher } from './linkedin';
import type { Provider, Publisher } from './types';

export const publishers: Record<Provider, Publisher> = {
  linkedin: linkedinPublisher,
  facebook: facebookPublisher,
  instagram: instagramPublisher,
};

export function getPublisher(provider: Provider): Publisher {
  const p = publishers[provider];
  if (!p) throw new Error(`Unknown provider: ${provider}`);
  return p;
}

export type { Provider, Publisher } from './types';
export { PublisherError } from './types';
