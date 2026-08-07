import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SubtitleSearchResult } from '@lightbird/core';
import { SubtitleSearchPanel, type SubtitleSearchPanelProps } from '../src/subtitle-search-panel';

function makeResult(overrides: Partial<SubtitleSearchResult> = {}): SubtitleSearchResult {
  return {
    fileId: '1',
    fileName: 'Movie.2019.en.srt',
    language: 'en',
    release: 'Movie.2019.1080p.BluRay',
    downloadCount: 1234,
    rating: 8,
    hearingImpaired: false,
    hashMatch: false,
    ...overrides,
  };
}

function renderPanel(overrides: Partial<SubtitleSearchPanelProps> = {}) {
  const props: SubtitleSearchPanelProps = {
    status: 'idle',
    results: [],
    mode: null,
    error: null,
    downloadingId: null,
    canSearch: true,
    onSearch: jest.fn(),
    onApply: jest.fn(),
    ...overrides,
  };
  return { ...render(<SubtitleSearchPanel {...props} />), props };
}

describe('SubtitleSearchPanel', () => {
  it('renders a search button when idle', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('renders nothing when search is unavailable on this deployment', () => {
    const { container } = renderPanel({ unavailable: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('calls onSearch when the button is clicked', async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(props.onSearch).toHaveBeenCalledTimes(1);
  });

  it('disables the search button when no video is loaded', () => {
    renderPanel({ canSearch: false });
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  it('reports progress while fingerprinting the video', () => {
    renderPanel({ status: 'hashing' });
    expect(screen.getByText(/fingerprinting video/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeDisabled();
  });

  it('reports progress while searching', () => {
    renderPanel({ status: 'searching' });
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('shows an error message when the search fails', () => {
    renderPanel({ status: 'error', error: 'Subtitle search rate limit reached' });
    expect(screen.getByText(/rate limit reached/i)).toBeInTheDocument();
  });

  it('shows an empty state when the search returns nothing', () => {
    renderPanel({ status: 'ready', results: [] });
    expect(screen.getByText(/no subtitles found/i)).toBeInTheDocument();
  });

  it('tells the user a hash match should be in sync', () => {
    renderPanel({ status: 'ready', mode: 'hash', results: [makeResult({ hashMatch: true })] });
    expect(screen.getByText(/should be in sync/i)).toBeInTheDocument();
  });

  it('warns that a filename match may need a sync offset', () => {
    renderPanel({ status: 'ready', mode: 'text', results: [makeResult()] });
    expect(screen.getByText(/may need a sync offset/i)).toBeInTheDocument();
  });

  it('renders the language name rather than the raw code', () => {
    renderPanel({ status: 'ready', mode: 'text', results: [makeResult({ language: 'fr' })] });
    expect(screen.getByText('French')).toBeInTheDocument();
  });

  it('shows the release name and an abbreviated download count', () => {
    renderPanel({ status: 'ready', mode: 'text', results: [makeResult()] });
    expect(screen.getByText('Movie.2019.1080p.BluRay')).toBeInTheDocument();
    expect(screen.getByText('1.2k')).toBeInTheDocument();
  });

  it('marks hash matches and hearing-impaired entries', () => {
    renderPanel({
      status: 'ready',
      mode: 'hash',
      results: [makeResult({ hashMatch: true, hearingImpaired: true })],
    });

    expect(screen.getByLabelText(/hash match/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hearing impaired/i)).toBeInTheDocument();
  });

  it('calls onApply with the clicked result', async () => {
    const user = userEvent.setup();
    const result = makeResult({ fileId: '42' });
    const { props } = renderPanel({ status: 'ready', mode: 'text', results: [result] });

    await user.click(screen.getByRole('listitem'));

    expect(props.onApply).toHaveBeenCalledWith(result);
  });

  it('disables every result while one is downloading', () => {
    renderPanel({
      status: 'ready',
      mode: 'text',
      results: [makeResult({ fileId: '1' }), makeResult({ fileId: '2' })],
      downloadingId: '1',
    });

    for (const item of screen.getAllByRole('listitem')) {
      expect(item).toBeDisabled();
    }
  });

  it('lists every result returned', () => {
    renderPanel({
      status: 'ready',
      mode: 'text',
      results: [makeResult({ fileId: '1' }), makeResult({ fileId: '2' }), makeResult({ fileId: '3' })],
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
