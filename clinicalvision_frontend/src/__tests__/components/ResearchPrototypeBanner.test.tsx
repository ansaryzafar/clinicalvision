import React from 'react';
import { render, screen } from '@testing-library/react';
import ResearchPrototypeBanner, { RESEARCH_BANNER_TEXT } from '../../components/shared/ResearchPrototypeBanner';

describe('ResearchPrototypeBanner', () => {
  it('renders the research-prototype disclaimer', () => {
    render(<ResearchPrototypeBanner />);
    expect(RESEARCH_BANNER_TEXT).toBe(
      'Research prototype. Not a medical device. Not for clinical use.'
    );
    expect(screen.getByRole('note')).toHaveTextContent(RESEARCH_BANNER_TEXT);
  });
});
