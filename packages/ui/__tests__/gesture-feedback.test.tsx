import React from 'react';
import { render, screen } from '@testing-library/react';
import { GestureFeedback } from '../src/gesture-feedback';

describe('GestureFeedback', () => {
  it('renders nothing when feedback is null', () => {
    const { container } = render(<GestureFeedback feedback={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a seek-forward indicator with the seek amount', () => {
    render(
      <GestureFeedback feedback={{ type: 'seek', direction: 'forward', seconds: 10 }} />,
    );
    expect(screen.getByTestId('gesture-feedback')).toBeInTheDocument();
    expect(screen.getByText('10s')).toBeInTheDocument();
  });

  it('renders a seek-backward indicator with the seek amount', () => {
    render(
      <GestureFeedback feedback={{ type: 'seek', direction: 'backward', seconds: 5 }} />,
    );
    expect(screen.getByTestId('gesture-feedback')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('renders the volume level as a labelled percentage with a bar', () => {
    render(<GestureFeedback feedback={{ type: 'volume', value: 0.6 }} />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByTestId('gesture-feedback-bar')).toHaveStyle({ width: '60%' });
  });

  it('renders the brightness level as a labelled percentage', () => {
    render(<GestureFeedback feedback={{ type: 'brightness', value: 0.25 }} />);
    expect(screen.getByText('Brightness')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByTestId('gesture-feedback-bar')).toHaveStyle({ width: '25%' });
  });
});
