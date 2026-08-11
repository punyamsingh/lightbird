import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
    defaultQuery: 'Movie 2019',
    onSearch: jest.fn(),
    onApply: jest.fn(),
    ...overrides,
  };
  return { ...render(<SubtitleSearchPanel {...props} />), props };
}

const byHash = () => screen.getByRole('button', { name: /by hash/i });
const byName = () => screen.getByRole('button', { name: /by name/i });

describe('SubtitleSearchPanel', () => {
  it('offers both searches when idle', () => {
    renderPanel();
    expect(byHash()).toBeInTheDocument();
    expect(byName()).toBeInTheDocument();
  });

  it('renders nothing when search is unavailable on this deployment', () => {
    const { container } = renderPanel({ unavailable: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('disables both searches when no video is loaded', () => {
    renderPanel({ canSearch: false });
    expect(byHash()).toBeDisabled();
    expect(byName()).toBeDisabled();
  });

  it('reports progress while fingerprinting the video', () => {
    renderPanel({ status: 'hashing' });
    expect(screen.getByText(/fingerprinting video/i)).toBeInTheDocument();
    expect(byHash()).toBeDisabled();
    expect(byName()).toBeDisabled();
  });
});

describe('SubtitleSearchPanel — choosing a search', () => {
  it('asks for a hash search with the fingerprint button', async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    await user.click(byHash());

    expect(props.onSearch).toHaveBeenCalledWith('hash', 'Movie 2019');
  });

  it('asks for a name search with the current query text', async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    await user.click(byName());

    expect(props.onSearch).toHaveBeenCalledWith('text', 'Movie 2019');
  });

  it('prefills the query box from the filename and searches the edited title', async () => {
    // The point of the box: a release filename is a poor query, so the user
    // corrects it before searching.
    const user = userEvent.setup();
    const { props } = renderPanel({ defaultQuery: 'Blade Runner 2049 2160p HDR' });
    const box = screen.getByRole('textbox', { name: /title to search for/i });
    expect(box).toHaveValue('Blade Runner 2049 2160p HDR');

    await user.clear(box);
    await user.type(box, 'Blade Runner 2049');
    await user.click(byName());

    expect(props.onSearch).toHaveBeenCalledWith('text', 'Blade Runner 2049');
  });

  it('submits a name search on Enter', async () => {
    const user = userEvent.setup();
    const { props } = renderPanel();

    await user.type(screen.getByRole('textbox', { name: /title to search for/i }), '{Enter}');

    expect(props.onSearch).toHaveBeenCalledWith('text', 'Movie 2019');
  });

  it('reseeds the query box when the video changes', () => {
    const { rerender, props } = renderPanel({ defaultQuery: 'First Film' });
    expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue('First Film');

    rerender(<SubtitleSearchPanel {...props} defaultQuery="Second Film" />);

    expect(screen.getByRole('textbox', { name: /title/i })).toHaveValue('Second Film');
  });

  it('reseeds the box when the video changes but the derived title does not', async () => {
    // Two files both named "video.mkv" derive the same query, so the title
    // alone cannot tell the videos apart — the correction typed for the first
    // one would otherwise be searched for the second.
    const user = userEvent.setup();
    const box = () => screen.getByRole('textbox', { name: /title/i });
    const { rerender, props } = renderPanel({ queryKey: 'item-1', defaultQuery: 'video' });

    await user.clear(box());
    await user.type(box(), 'Inception');
    rerender(<SubtitleSearchPanel {...props} queryKey="item-2" defaultQuery="video" />);

    expect(box()).toHaveValue('video');
  });

  it('keeps the edited title while the same video is playing', async () => {
    const user = userEvent.setup();
    const box = () => screen.getByRole('textbox', { name: /title/i });
    const { rerender, props } = renderPanel({ queryKey: 'item-1', defaultQuery: 'video' });

    await user.clear(box());
    await user.type(box(), 'Inception');
    rerender(<SubtitleSearchPanel {...props} queryKey="item-1" status="searching" />);

    expect(box()).toHaveValue('Inception');
  });

  it('disables only the hash search when the source cannot be fingerprinted', () => {
    // Streams and torrent-backed items have no local File to read.
    renderPanel({ canHash: false });
    expect(byHash()).toBeDisabled();
    expect(byName()).toBeEnabled();
  });

  it('disables the name search when the query has been emptied', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.clear(screen.getByRole('textbox', { name: /title/i }));

    expect(byName()).toBeDisabled();
    expect(byHash()).toBeEnabled();
  });

  it('points at the name search when a hash search finds nothing', () => {
    renderPanel({ status: 'ready', results: [], mode: 'hash' });
    expect(screen.getByText(/no subtitles indexed for this exact release/i)).toBeInTheDocument();
    expect(screen.getByText(/try searching by name/i)).toBeInTheDocument();
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

  it('exposes each result as a button, not inert list text', () => {
    // The list-item role belongs on a wrapper: assistive tech must announce
    // these as actions that download a subtitle.
    renderPanel({ status: 'ready', mode: 'text', results: [makeResult()] });

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getAllByRole('button')).toHaveLength(1);
  });

  it('calls onApply with the clicked result', async () => {
    const user = userEvent.setup();
    const result = makeResult({ fileId: '42' });
    const { props } = renderPanel({ status: 'ready', mode: 'text', results: [result] });

    await user.click(within(screen.getByRole('list')).getByRole('button'));

    expect(props.onApply).toHaveBeenCalledWith(result);
  });

  it('disables every result while one is downloading', () => {
    renderPanel({
      status: 'ready',
      mode: 'text',
      results: [makeResult({ fileId: '1' }), makeResult({ fileId: '2' })],
      downloadingId: '1',
    });

    for (const item of within(screen.getByRole('list')).getAllByRole('button')) {
      expect(item).toBeDisabled();
    }
  });

  it('lists every result returned', () => {
    renderPanel({
      status: 'ready',
      mode: 'text',
      results: [makeResult({ fileId: '1' }), makeResult({ fileId: '2' }), makeResult({ fileId: '3' })],
    });

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(3);
  });
});

describe('SubtitleSearchPanel — progress lands on the button you pressed', () => {
  const spinning = (el: HTMLElement) => Boolean(el.querySelector('.animate-spin'));

  it('keeps the spinner on the hash button through the network phase', async () => {
    // A hash search passes through "searching" once fingerprinting finishes.
    // Keying off status alone would move the spinner onto the name button
    // mid-request and imply a search the user never asked for.
    const user = userEvent.setup();
    const { rerender, props } = renderPanel();
    await user.click(byHash());

    rerender(<SubtitleSearchPanel {...props} status="hashing" />);
    expect(spinning(byHash())).toBe(true);
    expect(spinning(byName())).toBe(false);

    rerender(<SubtitleSearchPanel {...props} status="searching" />);
    expect(spinning(byHash())).toBe(true);
    expect(spinning(byName())).toBe(false);
  });

  it('keeps the spinner on the name button during a name search', async () => {
    const user = userEvent.setup();
    const { rerender, props } = renderPanel();
    await user.click(byName());

    rerender(<SubtitleSearchPanel {...props} status="searching" />);

    expect(spinning(byName())).toBe(true);
    expect(spinning(byHash())).toBe(false);
  });

  it('forgets which button it pressed once that search finishes', async () => {
    // Otherwise the next search — started elsewhere — would still point at the
    // button used by the previous one.
    const user = userEvent.setup();
    const { rerender, props } = renderPanel();
    await user.click(byHash());

    rerender(<SubtitleSearchPanel {...props} status="searching" />);
    rerender(<SubtitleSearchPanel {...props} status="ready" />);
    rerender(<SubtitleSearchPanel {...props} status="searching" />);

    expect(spinning(byHash())).toBe(true);
    expect(spinning(byName())).toBe(true);
  });

  it('shows neutral progress for a search it did not start', () => {
    // e.g. a search kicked off elsewhere in the app: better to show both busy
    // than to point confidently at the wrong one.
    renderPanel({ status: 'searching' });
    expect(spinning(byHash())).toBe(true);
    expect(spinning(byName())).toBe(true);
  });
});
