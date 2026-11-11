import React from 'react';
import { Box, GlobalStyles } from '@mui/material';

export const RESEARCH_BANNER_TEXT =
  'Research prototype. Not a medical device. Not for clinical use.';

const BANNER_HEIGHT_PX = 32;

/**
 * Persistent disclaimer shown on every route.
 * Fixed to the bottom so it cannot collide with the fixed top navigation,
 * and the body is padded so page content is never hidden behind it.
 */
const ResearchPrototypeBanner: React.FC = () => (
  <>
    <GlobalStyles styles={{ body: { paddingBottom: `${BANNER_HEIGHT_PX}px` } }} />
    <Box
      role="note"
      aria-label="Research prototype disclaimer"
      data-testid="research-prototype-banner"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: `${BANNER_HEIGHT_PX}px`,
        zIndex: 1400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        bgcolor: '#7a1f1f',
        color: '#ffffff',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {RESEARCH_BANNER_TEXT}
    </Box>
  </>
);

export default ResearchPrototypeBanner;
