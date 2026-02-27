/**
 * Enhanced Card Component
 * 
 * Production-grade card with:
 * - Hover effects
 * - Border animations
 * - Loading states
 * - Medical theme integration
 * - Glassmorphism option
 * - Performance optimized
 */

import React from 'react';
import { Card as MuiCard, CardProps as MuiCardProps, Skeleton } from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

export interface CardProps extends Omit<MuiCardProps, 'variant'> {
  variant?: 'default' | 'outlined' | 'elevated' | 'glass';
  hoverable?: boolean;
  loading?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const getCardStyles = (
  variant: 'default' | 'outlined' | 'elevated' | 'glass',
  hoverable: boolean,
  interactive: boolean
) => {
  const baseStyles = {
    background: '#0B0B0B',
    borderRadius: '12px',
    padding: '24px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: interactive ? 'pointer' : 'default',
  };

  const variants = {
    default: {
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: 'none',
    },
    outlined: {
      border: '2px solid rgba(123, 45, 142, 0.3)',
      boxShadow: '0 2px 8px rgba(123, 45, 142, 0.1)',
    },
    elevated: {
      border: '1px solid rgba(255, 255, 255, 0.05)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    },
    glass: {
      background: 'rgba(11, 11, 11, 0.7)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
  };

  const hoverStyles = hoverable || interactive ? {
    '&:hover': {
      transform: 'translateY(-4px)',
      boxShadow: variant === 'outlined'
        ? '0 8px 24px rgba(123, 45, 142, 0.25)'
        : '0 12px 40px rgba(0, 0, 0, 0.5)',
      borderColor: variant === 'outlined' ? '#7B2D8E' : undefined,
    },
  } : {};

  return {
    ...baseStyles,
    ...variants[variant],
    ...hoverStyles,
  };
};

const StyledCard = styled(motion.div, {
  shouldForwardProp: (prop) => !['variant', 'hoverable', 'interactive'].includes(prop as string),
})<{
  variant: 'default' | 'outlined' | 'elevated' | 'glass';
  hoverable: boolean;
  interactive: boolean;
}>(({ variant, hoverable, interactive }) =>
  getCardStyles(variant, hoverable, interactive) as any
);

// ============================================================================
// LOADING SKELETON
// ============================================================================

interface CardSkeletonProps {
  lines?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ lines = 3 }) => (
  <StyledCard
    variant="default"
    hoverable={false}
    interactive={false}
    style={{ pointerEvents: 'none' }}
  >
    <Skeleton
      variant="rectangular"
      width="100%"
      height={40}
      sx={{
        bgcolor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '60%' : '100%'}
        height={20}
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.05)',
          marginBottom: '8px',
        }}
      />
    ))}
  </StyledCard>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      hoverable = false,
      loading = false,
      interactive = false,
      onClick,
      children,
      // Strip native drag handlers that conflict with framer-motion
      onDrag: _onDrag,
      onDragStart: _onDragStart,
      onDragEnd: _onDragEnd,
      ...props
    },
    ref
  ) => {
    const isInteractive = interactive || !!onClick;

    const cardVariants = {
      rest: { scale: 1, y: 0 },
      hover: { scale: 1.01, y: -4 },
      tap: { scale: 0.99 },
    };

    const handleClick = () => {
      if (onClick && !loading) {
        onClick();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleClick();
      }
    };

    if (loading) {
      return <CardSkeleton />;
    }

    return (
      // @ts-expect-error framer-motion HTMLMotionProps onDrag conflicts with React DragEvent handler
      <StyledCard
        ref={ref}
        variant={variant}
        hoverable={hoverable}
        interactive={isInteractive}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        aria-pressed={isInteractive ? false : undefined}
        variants={hoverable || isInteractive ? cardVariants : undefined}
        initial="rest"
        whileHover={hoverable || isInteractive ? 'hover' : undefined}
        whileTap={isInteractive ? 'tap' : undefined}
        {...props}
      >
        {children}
      </StyledCard>
    );
  }
);

Card.displayName = 'Card';

// ============================================================================
// SPECIALIZED VARIANTS
// ============================================================================

export const OutlinedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="outlined" {...props} />
);

export const ElevatedCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="elevated" {...props} />
);

export const GlassCard: React.FC<Omit<CardProps, 'variant'>> = (props) => (
  <Card variant="glass" {...props} />
);

// ============================================================================
// COMPOUND COMPONENTS
// ============================================================================

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: '16px',
    }}
  >
    <div style={{ flex: 1 }}>
      <h3
        style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#FFFFFF',
          fontFamily: '"Poppins", system-ui, sans-serif',
        }}
      >
        {title}
      </h3>
      {subtitle && (
        <p
          style={{
            margin: '4px 0 0',
            fontSize: '0.875rem',
            color: '#B0B0B0',
            fontFamily: '"Inter", system-ui, sans-serif',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export interface CardContentProps {
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ children }) => (
  <div
    style={{
      color: '#E0E0E0',
      fontSize: '0.938rem',
      lineHeight: 1.6,
      fontFamily: '"Inter", system-ui, sans-serif',
    }}
  >
    {children}
  </div>
);

export interface CardFooterProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  align = 'right',
}) => (
  <div
    style={{
      marginTop: '20px',
      paddingTop: '16px',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      justifyContent:
        align === 'left'
          ? 'flex-start'
          : align === 'right'
          ? 'flex-end'
          : 'center',
      gap: '12px',
    }}
  >
    {children}
  </div>
);
