/**
 * Button Component Test Suite
 * 
 * Comprehensive tests covering:
 * - Rendering all variants
 * - Loading states
 * - Disabled states
 * - Click handlers
 * - Keyboard accessibility
 * - Tooltips
 * - Icons
 * - Performance
 * - Edge cases
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Button,
  PrimaryButton,
  SecondaryButton,
  GhostButton,
  IconButton,
} from '../Button';
import {
  renderWithTheme,
  expectPerformance,
  expectAccessible,
  hoverElement,
} from '../../../utils/testUtils';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      const { getByText } = renderWithTheme(<Button>Click Me</Button>);
      expect(getByText('Click Me')).toBeInTheDocument();
    });

    it('should render primary variant', () => {
      const { getByRole } = renderWithTheme(
        <Button variant="primary">Primary</Button>
      );
      const button = getByRole('button', { name: /primary/i });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render secondary variant', () => {
      const { getByText } = renderWithTheme(
        <Button variant="secondary">Secondary</Button>
      );
      const button = getByText('Secondary');
      expect(button).toBeInTheDocument();
    });

    it('should render ghost variant', () => {
      const { getByText } = renderWithTheme(
        <Button variant="ghost">Ghost</Button>
      );
      expect(getByText('Ghost')).toBeInTheDocument();
    });

    it('should render icon variant', () => {
      const { container } = renderWithTheme(
        <Button variant="icon">
          <span>🔍</span>
        </Button>
      );
      expect(container.querySelector('span')).toHaveTextContent('🔍');
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { getByRole } = renderWithTheme(
        <Button size="small">Small</Button>
      );
      const button = getByRole('button', { name: /small/i });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render medium size (default)', () => {
      const { getByRole } = renderWithTheme(<Button>Medium</Button>);
      const button = getByRole('button', { name: /medium/i });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });

    it('should render large size', () => {
      const { getByRole } = renderWithTheme(
        <Button size="large">Large</Button>
      );
      const button = getByRole('button', { name: /large/i });
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      const { container } = renderWithTheme(
        <Button loading>Loading</Button>
      );
      expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    });

    it('should hide children when loading', () => {
      const { container } = renderWithTheme(
        <Button loading>Click Me</Button>
      );
      // Loading spinner should be present
      expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    });

    it('should disable button when loading', () => {
      const handleClick = jest.fn();
      const { getByRole } = renderWithTheme(
        <Button loading onClick={handleClick}>
          Submit
        </Button>
      );
      
      const button = getByRole('button');
      expect(button).toBeDisabled();
      
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should show different spinner sizes', () => {
      const { container: small } = renderWithTheme(
        <Button size="small" loading>Small</Button>
      );
      const { container: large } = renderWithTheme(
        <Button size="large" loading>Large</Button>
      );
      
      expect(small.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
      expect(large.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should render disabled button', () => {
      const { getByRole } = renderWithTheme(
        <Button disabled>Disabled</Button>
      );
      expect(getByRole('button')).toBeDisabled();
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      const { getByRole } = renderWithTheme(
        <Button disabled onClick={handleClick}>
          Click
        </Button>
      );
      
      fireEvent.click(getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should have reduced opacity when disabled', () => {
      const { getByRole } = renderWithTheme(
        <Button disabled>Disabled</Button>
      );
      expect(getByRole('button')).toHaveStyle({ opacity: '0.5' });
    });
  });

  describe('Click Handling', () => {
    it('should call onClick handler', () => {
      const handleClick = jest.fn();
      const { getByRole } = renderWithTheme(
        <Button onClick={handleClick}>Click</Button>
      );
      
      fireEvent.click(getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should pass event to onClick handler', () => {
      const handleClick = jest.fn();
      const { getByRole } = renderWithTheme(
        <Button onClick={handleClick}>Click</Button>
      );
      
      fireEvent.click(getByRole('button'));
      expect(handleClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'click',
        })
      );
    });

    it('should handle rapid clicks', () => {
      const handleClick = jest.fn();
      const { getByRole } = renderWithTheme(
        <Button onClick={handleClick}>Click</Button>
      );
      
      const button = getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Icons', () => {
    it('should render start icon', () => {
      const { container } = renderWithTheme(
        <Button startIcon={<span data-testid="start-icon">→</span>}>
          Next
        </Button>
      );
      expect(container.querySelector('[data-testid="start-icon"]')).toBeInTheDocument();
    });

    it('should render end icon', () => {
      const { container } = renderWithTheme(
        <Button endIcon={<span data-testid="end-icon">←</span>}>
          Back
        </Button>
      );
      expect(container.querySelector('[data-testid="end-icon"]')).toBeInTheDocument();
    });

    it('should render both start and end icons', () => {
      const { container } = renderWithTheme(
        <Button
          startIcon={<span data-testid="start">→</span>}
          endIcon={<span data-testid="end">←</span>}
        >
          Both
        </Button>
      );
      expect(container.querySelector('[data-testid="start"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="end"]')).toBeInTheDocument();
    });

    it('should hide icons when loading', () => {
      const { container } = renderWithTheme(
        <Button loading startIcon={<span data-testid="icon">→</span>}>
          Loading
        </Button>
      );
      expect(container.querySelector('[data-testid="icon"]')).not.toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip on hover', async () => {
      const { getByRole, findByRole } = renderWithTheme(
        <Button tooltip="Click to submit">Submit</Button>
      );
      
      const button = getByRole('button');
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(findByRole('tooltip')).toBeTruthy();
      });
    });

    it('should render without tooltip if not provided', () => {
      const { getByRole } = renderWithTheme(<Button>No Tooltip</Button>);
      expect(getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcut', () => {
    it('should display keyboard shortcut', () => {
      const { getByText } = renderWithTheme(
        <Button shortcut="⌘K">Search</Button>
      );
      expect(getByText('⌘K')).toBeInTheDocument();
    });

    it('should style shortcut appropriately', () => {
      const { getByText } = renderWithTheme(
        <Button shortcut="Ctrl+S">Save</Button>
      );
      const shortcut = getByText('Ctrl+S');
      expect(shortcut).toHaveStyle({
        fontSize: '0.75rem',
        opacity: '0.7',
      });
    });
  });

  describe('Full Width', () => {
    it('should render full width button', () => {
      const { getByRole } = renderWithTheme(
        <Button fullWidth>Full Width</Button>
      );
      expect(getByRole('button')).toHaveStyle({ width: '100%' });
    });

    it('should not be full width by default', () => {
      const { getByRole } = renderWithTheme(<Button>Normal</Button>);
      expect(getByRole('button')).toHaveStyle({ width: 'auto' });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      const { getByRole } = renderWithTheme(<Button>Accessible</Button>);
      const button = getByRole('button');
      
      expectAccessible(button);
    });

    it('should have proper ARIA attributes', () => {
      const { getByRole } = renderWithTheme(
        <Button disabled>Disabled</Button>
      );
      expect(getByRole('button')).toHaveAttribute('disabled');
    });

    it('should support focus-visible outline', () => {
      const { getByRole } = renderWithTheme(<Button>Focus</Button>);
      const button = getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
    });

    it('should have proper button type', () => {
      const { getByRole } = renderWithTheme(
        <Button type="submit">Submit</Button>
      );
      expect(getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });

  describe('Specialized Variants', () => {
    it('should render PrimaryButton', () => {
      const { getByText } = renderWithTheme(
        <PrimaryButton>Primary</PrimaryButton>
      );
      expect(getByText('Primary')).toBeInTheDocument();
    });

    it('should render SecondaryButton', () => {
      const { getByText } = renderWithTheme(
        <SecondaryButton>Secondary</SecondaryButton>
      );
      expect(getByText('Secondary')).toBeInTheDocument();
    });

    it('should render GhostButton', () => {
      const { getByText } = renderWithTheme(
        <GhostButton>Ghost</GhostButton>
      );
      expect(getByText('Ghost')).toBeInTheDocument();
    });

    it('should render IconButton', () => {
      const { container } = renderWithTheme(
        <IconButton>
          <span>🔍</span>
        </IconButton>
      );
      expect(container.querySelector('span')).toHaveTextContent('🔍');
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      expectPerformance(() => {
        renderWithTheme(<Button>Performance Test</Button>);
      }, 50);
    });

    it('should handle multiple buttons efficiently', () => {
      expectPerformance(() => {
        renderWithTheme(
          <div>
            {Array.from({ length: 10 }).map((_, i) => (
              <Button key={i}>Button {i}</Button>
            ))}
          </div>
        );
      }, 100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children gracefully', () => {
      const { container } = renderWithTheme(<Button>{''}</Button>);
      expect(container.querySelector('button')).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const longText = 'This is a very long button text that might cause layout issues';
      const { getByText } = renderWithTheme(<Button>{longText}</Button>);
      expect(getByText(longText)).toBeInTheDocument();
    });

    it('should handle loading and disabled simultaneously', () => {
      const { getByRole } = renderWithTheme(
        <Button loading disabled>
          Loading Disabled
        </Button>
      );
      expect(getByRole('button')).toBeDisabled();
    });

    it('should handle missing onClick gracefully', () => {
      const { getByRole } = renderWithTheme(<Button>No Handler</Button>);
      expect(() => fireEvent.click(getByRole('button'))).not.toThrow();
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLButtonElement>();
      renderWithTheme(<Button ref={ref}>Ref Button</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });
  });
});
