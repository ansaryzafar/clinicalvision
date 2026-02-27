/**
 * Loading Skeleton Components
 * 
 * Performance-optimized loading indicators:
 * - Various skeleton types
 * - Animation control
 * - Theme-integrated
 * - Accessibility compliant
 * - Memory efficient
 */

import React from 'react';
import { Skeleton, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

// ============================================================================
// TYPES
// ============================================================================

export interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | false;
  count?: number;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const StyledSkeleton = styled(Skeleton)(({ theme }) => ({
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  '&::after': {
    background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent)',
  },
}));

// ============================================================================
// BASE SKELETON
// ============================================================================

export const LoadingSkeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width = '100%',
  height,
  animation = 'wave',
  count = 1,
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <StyledSkeleton
          key={index}
          variant={variant}
          width={width}
          height={height}
          animation={animation}
          sx={{ marginBottom: index < count - 1 ? '8px' : 0 }}
        />
      ))}
    </>
  );
};

// ============================================================================
// SPECIALIZED SKELETONS
// ============================================================================

/**
 * Image Skeleton
 */
export const ImageSkeleton: React.FC<{
  width?: string | number;
  height?: string | number;
}> = ({ width = '100%', height = 400 }) => (
  <StyledSkeleton
    variant="rectangular"
    width={width}
    height={height}
    animation="wave"
    sx={{ borderRadius: '12px' }}
  />
);

/**
 * Card Skeleton
 */
export const CardSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => (
  <Box
    sx={{
      padding: '24px',
      background: '#0B0B0B',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}
  >
    <StyledSkeleton variant="rectangular" width="100%" height={40} sx={{ marginBottom: '16px', borderRadius: '8px' }} />
    {Array.from({ length: lines }).map((_, i) => (
      <StyledSkeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '60%' : '100%'}
        height={20}
        sx={{ marginBottom: '8px' }}
      />
    ))}
  </Box>
);

/**
 * List Item Skeleton
 */
export const ListItemSkeleton: React.FC<{
  avatar?: boolean;
  lines?: number;
}> = ({ avatar = false, lines = 2 }) => (
  <Box
    sx={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    }}
  >
    {avatar && (
      <StyledSkeleton variant="circular" width={48} height={48} />
    )}
    <Box sx={{ flex: 1 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <StyledSkeleton
          key={i}
          variant="text"
          width={i === 0 ? '70%' : '100%'}
          height={i === 0 ? 24 : 16}
          sx={{ marginBottom: i < lines - 1 ? '8px' : 0 }}
        />
      ))}
    </Box>
  </Box>
);

/**
 * Table Skeleton
 */
export const TableSkeleton: React.FC<{
  rows?: number;
  columns?: number;
}> = ({ rows = 5, columns = 4 }) => (
  <Box>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box
        key={rowIndex}
        sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '16px',
          padding: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {Array.from({ length: columns }).map((_, colIndex) => (
          <StyledSkeleton
            key={colIndex}
            variant="text"
            height={rowIndex === 0 ? 24 : 20}
          />
        ))}
      </Box>
    ))}
  </Box>
);

/**
 * Medical Image Grid Skeleton
 */
export const ImageGridSkeleton: React.FC<{
  count?: number;
  columns?: number;
}> = ({ count = 6, columns = 3 }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '16px',
    }}
  >
    {Array.from({ length: count }).map((_, index) => (
      <Box key={index}>
        <ImageSkeleton height={200} />
        <StyledSkeleton
          variant="text"
          width="80%"
          height={20}
          sx={{ marginTop: '12px' }}
        />
        <StyledSkeleton variant="text" width="60%" height={16} />
      </Box>
    ))}
  </Box>
);

/**
 * Dashboard Stats Skeleton
 */
export const StatsSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
      gap: '16px',
    }}
  >
    {Array.from({ length: count }).map((_, index) => (
      <Box
        key={index}
        sx={{
          padding: '24px',
          background: '#0B0B0B',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <StyledSkeleton variant="text" width="60%" height={20} />
        <StyledSkeleton variant="text" width="40%" height={40} sx={{ marginTop: '12px' }} />
        <StyledSkeleton variant="text" width="80%" height={16} sx={{ marginTop: '8px' }} />
      </Box>
    ))}
  </Box>
);

/**
 * Analysis Result Skeleton
 */
export const AnalysisResultSkeleton: React.FC = () => (
  <Box
    sx={{
      padding: '32px',
      background: '#0B0B0B',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}
  >
    {/* Header */}
    <Box sx={{ marginBottom: '24px' }}>
      <StyledSkeleton variant="text" width="30%" height={32} />
      <StyledSkeleton variant="text" width="50%" height={20} sx={{ marginTop: '8px' }} />
    </Box>
    
    {/* Image Preview */}
    <ImageSkeleton height={300} />
    
    {/* Results */}
    <Box sx={{ marginTop: '24px' }}>
      <StyledSkeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: '8px', marginBottom: '16px' }} />
      <StyledSkeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: '8px', marginBottom: '16px' }} />
      <StyledSkeleton variant="rectangular" width="100%" height={60} sx={{ borderRadius: '8px' }} />
    </Box>
    
    {/* Actions */}
    <Box sx={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
      <StyledSkeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: '8px' }} />
      <StyledSkeleton variant="rectangular" width={120} height={40} sx={{ borderRadius: '8px' }} />
    </Box>
  </Box>
);

/**
 * Page Loading Skeleton
 */
export const PageLoadingSkeleton: React.FC = () => (
  <Box sx={{ padding: '32px' }}>
    {/* Header */}
    <Box sx={{ marginBottom: '32px' }}>
      <StyledSkeleton variant="text" width="40%" height={40} />
      <StyledSkeleton variant="text" width="60%" height={24} sx={{ marginTop: '12px' }} />
    </Box>
    
    {/* Stats Cards */}
    <StatsSkeleton count={4} />
    
    {/* Content */}
    <Box sx={{ marginTop: '32px' }}>
      <CardSkeleton lines={5} />
    </Box>
  </Box>
);

// ============================================================================
// EXPORT
// ============================================================================

export default {
  LoadingSkeleton,
  ImageSkeleton,
  CardSkeleton,
  ListItemSkeleton,
  TableSkeleton,
  ImageGridSkeleton,
  StatsSkeleton,
  AnalysisResultSkeleton,
  PageLoadingSkeleton,
};
