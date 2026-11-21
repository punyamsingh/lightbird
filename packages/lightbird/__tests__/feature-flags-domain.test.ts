import { OpenFeature, InMemoryProvider } from '@openfeature/web-sdk';
import { FLAG_MAGNET_LINK, LIGHTBIRD_FEATURE_DOMAIN, initFeatureFlags } from '../src/feature-flags';

// Keep the real SDK registry; replace only the network-backed provider.
jest.mock('@openfeature/unleash-web-provider', () => {
  const { InMemoryProvider } = jest.requireActual('@openfeature/web-sdk');
  return {
    UnleashWebProvider: class extends InMemoryProvider {
      constructor() {
        super({ 'magnet-link-enabled': { variants: { enabled: false }, defaultVariant: 'enabled', disabled: false } });
      }
    },
  };
});

test('initialization registers only the LightBird domain and preserves the host default provider', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_UNLEASH_URL;
  const previousKey = process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY;
  process.env.NEXT_PUBLIC_UNLEASH_URL = 'https://unleash.example.com/api/frontend';
  process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY = 'public-frontend-token';
  const host = new InMemoryProvider({ [FLAG_MAGNET_LINK]: { variants: { host: true }, defaultVariant: 'host', disabled: false } });
  try {
    await OpenFeature.setProviderAndWait(host);
    await initFeatureFlags();
    expect(OpenFeature.getProvider()).toBe(host);
    expect(OpenFeature.getClient().getBooleanValue(FLAG_MAGNET_LINK, false)).toBe(true);
    expect(OpenFeature.getClient(LIGHTBIRD_FEATURE_DOMAIN).getBooleanValue(FLAG_MAGNET_LINK, true)).toBe(false);
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_UNLEASH_URL;
    else process.env.NEXT_PUBLIC_UNLEASH_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY;
    else process.env.NEXT_PUBLIC_UNLEASH_CLIENT_KEY = previousKey;
    await OpenFeature.clearProviders();
  }
});
