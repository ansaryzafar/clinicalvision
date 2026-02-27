/**
 * Production-Grade Button Component
 * 
 * Features:
 * - 4 variants (primary, secondary, ghost, icon)
 * - Loading states with spinners
 * - Disabled states
 * - Keyboard shortcuts
 * - Tooltip integration
 * - Hover effects with lift animation
 * - Medical theme integration
 * - Full accessibility support
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { CircularProgress, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';

// ============================================================================
// TYPES
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  tooltip?: string;
  shortcut?: string;
  href?: string;
  type?: 'button' | 'submit' | 'reset';
  children: React.ReactNode;
}

// ============================================================================
// STYLED COMPONENTS
// ============================================================================

const getButtonStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth?: boolean
) => {
  // Size configurations
  const sizes = {
    small: {
      padding: '6px 16px',
      fontSize: '0.813rem',
      minHeight: '32px',
      iconSize: '16px',
    },
    medium: {
      padding: '10px 24px',
      fontSize: '0.875rem',
      minHeight: '40px',
      iconSize: '20px',
    },
    large: {
      padding: '14px 32px',
      fontSize: '1rem',
      minHeight: '48px',
      iconSize: '24px',
    },
  };

  // Variant configurations
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #7B2D8E 0%, #9A4DAD 100%)',
      color: '#FFFFFF',
      border: 'none',
      hoverBackground: 'linear-gradient(135deg, #9A4DAD 0%, #B868C8 100%)',
      activeShadow: '0 0 20px rgba(123, 45, 142, 0.5)',
    },
    secondary: {
      background: 'transparent',
      color: '#7B2D8E',
      border: '2px solid #7B2D8E',
      hoverBackground: 'rgba(123, 45, 142, 0.1)',
      activeShadow: '0 0 15px rgba(123, 45, 142, 0.3)',
    },
    ghost: {
      background: 'transparent',
      color: '#B0B0B0',
      border: 'none',
      hoverBackground: 'rgba(255, 255, 255, 0.05)',
      activeShadow: 'none',
    },
    icon: {
      background: 'transparent',
      color: '#B0B0B0',
      border: 'none',
      hoverBackground: 'rgba(255, 255, 255, 0.08)',
      activeShadow: 'none',
    },
  };

  const sizeConfig = sizes[size];
  const variantConfig = variants[variant];

  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: variant === 'icon' ? '8px' : sizeConfig.padding,
    minHeight: variant === 'icon' ? sizeConfig.iconSize : sizeConfig.minHeight,
    minWidth: variant === 'icon' ? sizeConfig.iconSize : 'auto',
    fontSize: sizeConfig.fontSize,
    fontWeight: 600,
    fontFamily: '"Inter", system-ui, sans-serif',
    lineHeight: 1.5,
    borderRadius: variant === 'icon' ? '50%' : '12px',
    border: variantConfig.border,
    background: variantConfig.background,
    color: variantConfig.color,
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    width: fullWidth ? '100%' : 'auto',
    
    '&:hover:not(:disabled)': {
      background: variantConfig.hoverBackground,
      transform: 'translateY(-2px)',
      boxShadow: variantConfig.activeShadow,
    },
    
    '&:active:not(:disabled)': {
      transform: 'translateY(0)',
      boxShadow: 'none',
    },
    
    '&:focus-visible': {
      outline: '2px solid #7B2D8E',
      outlineOffset: '2px',
    },
    
    '&:disabled': {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    },
  };
};

const StyledButton = styled(motion.button, {
  shouldForwardProp: (prop) => !['variant', 'size', 'fullWidth'].includes(prop as string),
})<{
  variant: ButtonVariant;
  size: ButtonSize;
  fullWidth?: boolean;
}>(({ variant, size, fullWidth }) => getButtonStyles(variant, size, fullWidth) as any);

// ============================================================================
// COMPONENT
// ============================================================================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'medium',
      loading = false,
      disabled = false,
      fullWidth = false,
      startIcon,
      endIcon,
      tooltip,
      shortcut,
      href,
      type = 'button',
      onClick,
      children,
      // Strip native drag event handlers that conflict with framer-motion's onDrag
      onDrag: _onDrag,
      onDragStart: _onDragStart,
      onDragEnd: _onDragEnd,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    
    // Animation variants
    const buttonVariants = {
      rest: { scale: 1 },
      hover: { scale: variant === 'icon' ? 1.1 : 1.02 },
      tap: { scale: 0.98 },
    };

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!isDisabled && onClick) {
        onClick(e);
      }
    };

    const buttonContent = (
      <>
        {loading && (
          <CircularProgress
            size={size === 'small' ? 14 : size === 'medium' ? 16 : 18}
            sx={{ color: 'inherit' }}
          />
        )}
        {!loading && startIcon && (
          <span className="button-icon start-icon">{startIcon}</span>
        )}
        {!loading && variant !== 'icon' && (
          <span className="button-text">{children}</span>
        )}
        {variant === 'icon' && !loading && children}
        {!loading && endIcon && (
          <span className="button-icon end-icon">{endIcon}</span>
        )}
        {shortcut && (
          <span
            style={{
              fontSize: '0.75rem',
              opacity: 0.7,
              marginLeft: '8px',
              padding: '2px 6px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
            }}
          >
            {shortcut}
          </span>
        )}
      </>
    );

    const buttonElement = (
      // @ts-expect-error framer-motion HTMLMotionProps onDrag conflicts with React DragEvent handler
      <StyledButton
        ref={ref}
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        type={type}
        disabled={isDisabled}
        onClick={handleClick}
        variants={buttonVariants}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        {...props}
      >
        {buttonContent}
      </StyledButton>
    );

    if (tooltip) {
      return (
        <Tooltip title={tooltip} arrow placement="top">
          <span style={{ display: fullWidth ? 'block' : 'inline-block' }}>
            {buttonElement}
          </span>
        </Tooltip>
      );
    }

    return buttonElement;
  }
);

Button.displayName = 'Button';

// ============================================================================
// SPECIALIZED BUTTON VARIANTS
// ============================================================================

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const IconButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="icon" {...props} />
);
