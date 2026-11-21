import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { OpenFeatureProvider, useBooleanFlagValue, OpenFeature, InMemoryProvider } from '@openfeature/react-sdk';
import { FLAG_MAGNET_LINK, LIGHTBIRD_FEATURE_DOMAIN } from '@lightbird/core';
import { FeatureFlagsProvider } from '../src/feature-flags-provider';

jest.mock('@lightbird/core', () => ({ ...jest.requireActual('@lightbird/core'), initFeatureFlags: jest.fn().mockResolvedValue(undefined) }));

function FlagReader({ name }: { name: string }) {
  return <span data-testid={name}>{String(useBooleanFlagValue(FLAG_MAGNET_LINK, false))}</span>;
}

test('LightBird reads the named domain while host consumers keep their default context', async () => {
  const host = new InMemoryProvider({ [FLAG_MAGNET_LINK]: { variants: { host: false }, defaultVariant: 'host', disabled: false } });
  const lightbird = new InMemoryProvider({ [FLAG_MAGNET_LINK]: { variants: { lightbird: true }, defaultVariant: 'lightbird', disabled: false } });
  await OpenFeature.setProviderAndWait(host);
  await OpenFeature.setProviderAndWait(LIGHTBIRD_FEATURE_DOMAIN, lightbird);
  const view = render(
    <OpenFeatureProvider suspendUntilReady={false}>
      <FlagReader name="host-before" />
      <FeatureFlagsProvider><FlagReader name="lightbird" /></FeatureFlagsProvider>
      <FlagReader name="host-after" />
    </OpenFeatureProvider>,
  );
  try {
    expect(screen.getByTestId('lightbird')).toHaveTextContent('true');
    expect(screen.getByTestId('host-before')).toHaveTextContent('false');
    expect(screen.getByTestId('host-after')).toHaveTextContent('false');
    expect(OpenFeature.getProvider()).toBe(host);
  } finally {
    view.unmount();
    await act(async () => { OpenFeature.clearProviders(); });
  }
});
