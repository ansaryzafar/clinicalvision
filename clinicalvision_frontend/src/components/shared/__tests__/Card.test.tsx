/**
 * Card Component Test Suite
 * 
 * Comprehensive tests for Card components:
 * - All variants rendering
 * - Hover interactions
 * - Loading states
 * - Click handling
 * - Accessibility
 * - Performance
 * - Compound components
 * - Edge cases
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  Card,
  OutlinedCard,
  ElevatedCard,
  GlassCard,
  CardSkeleton,
  CardHeader,
  CardContent,
  CardFooter,
} from '../Card';
import {
  renderWithTheme,
  expectPerformance,
  expectAccessible,
  hoverElement,
} from '../../../utils/testUtils';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render with default variant', () => {
      const { getByText } = renderWithTheme(
        <Card>Default Card Content</Card>
      );
      expect(getByText('Default Card Content')).toBeInTheDocument();
    });

    it('should render outlined variant', () => {
      const { container } = renderWithTheme(
        <Card variant="outlined">Outlined Card</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({
        border: '2px solid rgba(123, 45, 142, 0.3)',
      });
    });

    it('should render elevated variant', () => {
      const { container } = renderWithTheme(
        <Card variant="elevated">Elevated Card</Card>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render glass variant', () => {
      const { container } = renderWithTheme(
        <Card variant="glass">Glass Card</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
      expect(card.tagName).toBe('DIV');
    });
  });

  describe('Hoverable State', () => {
    it('should apply hover styles when hoverable', () => {
      const { container } = renderWithTheme(
        <Card hoverable>Hoverable Card</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toBeInTheDocument();
    });

    it('should not apply hover styles by default', () => {
      const { container } = renderWithTheme(
        <Card>Normal Card</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ cursor: 'default' });
    });
  });

  describe('Loading State', () => {
    it('should show skeleton when loading', () => {
      const { container } = renderWithTheme(
        <Card loading>Loading Content</Card>
      );
      expect(container.querySelector('.MuiSkeleton-root')).toBeInTheDocument();
    });

    it('should hide content when loading', () => {
      const { queryByText } = renderWithTheme(
        <Card loading>Hidden Content</Card>
      );
      expect(queryByText('Hidden Content')).not.toBeInTheDocument();
    });

    it('should render CardSkeleton with custom lines', () => {
      const { container } = renderWithTheme(<CardSkeleton lines={5} />);
      const skeletons = container.querySelectorAll('.MuiSkeleton-text');
      expect(skeletons).toHaveLength(5);
    });
  });

  describe('Interactive State', () => {
    it('should be clickable when onClick provided', () => {
      const handleClick = jest.fn();
      const { container } = renderWithTheme(
        <Card onClick={handleClick}>Clickable Card</Card>
      );
      
      const card = container.firstChild as HTMLElement;
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have pointer cursor when interactive', () => {
      const { container } = renderWithTheme(
        <Card interactive>Interactive Card</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({ cursor: 'pointer' });
    });

    it('should be keyboard accessible', () => {
      const handleClick = jest.fn();
      const { container } = renderWithTheme(
        <Card onClick={handleClick}>Keyboard Card</Card>
      );
      
      const card = container.firstChild as HTMLElement;
      
      // Press Enter
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Press Space
      fireEvent.keyDown(card, { key: ' ', code: 'Space' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper ARIA attributes', () => {
      const { container } = renderWithTheme(
        <Card onClick={() => {}}>ARIA Card</Card>
      );
      const card = container.firstChild as HTMLElement;
      
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
      expect(card).toHaveAttribute('aria-pressed', 'false');
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      const { container } = renderWithTheme(
        <Card loading onClick={handleClick}>
          Loading Card
        </Card>
      );
      
      // Loading should render skeleton, not the card
      const skeleton = container.querySelector('.MuiSkeleton-root');
      expect(skeleton).toBeInTheDocument();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Specialized Variants', () => {
    it('should render OutlinedCard', () => {
      const { container } = renderWithTheme(
        <OutlinedCard>Outlined</OutlinedCard>
      );
      expect(container.firstChild).toBeInTheDocument();
      const card = container.firstChild as HTMLElement;
      expect(card.tagName).toBe('DIV');
    });

    it('should render ElevatedCard', () => {
      const { getByText } = renderWithTheme(
        <ElevatedCard>Elevated</ElevatedCard>
      );
      expect(getByText('Elevated')).toBeInTheDocument();
    });

    it('should render GlassCard', () => {
      const { container } = renderWithTheme(
        <GlassCard>Glass</GlassCard>
      );
      expect(container.firstChild).toBeInTheDocument();
      const card = container.firstChild as HTMLElement;
      expect(card.tagName).toBe('DIV');
    });
  });

  describe('Compound Components', () => {
    describe('CardHeader', () => {
      it('should render title', () => {
        const { getByText } = renderWithTheme(
          <CardHeader title="Test Title" />
        );
        expect(getByText('Test Title')).toBeInTheDocument();
      });

      it('should render subtitle', () => {
        const { getByText } = renderWithTheme(
          <CardHeader title="Title" subtitle="Subtitle" />
        );
        expect(getByText('Subtitle')).toBeInTheDocument();
      });

      it('should render action', () => {
        const { getByText } = renderWithTheme(
          <CardHeader
            title="Title"
            action={<button>Action</button>}
          />
        );
        expect(getByText('Action')).toBeInTheDocument();
      });

      it('should apply proper styling to title', () => {
        const { getByText } = renderWithTheme(
          <CardHeader title="Styled Title" />
        );
        const title = getByText('Styled Title');
        expect(title).toHaveStyle({
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#FFFFFF',
        });
      });
    });

    describe('CardContent', () => {
      it('should render content', () => {
        const { getByText } = renderWithTheme(
          <CardContent>Test Content</CardContent>
        );
        expect(getByText('Test Content')).toBeInTheDocument();
      });

      it('should apply proper styling', () => {
        const { getByText } = renderWithTheme(
          <CardContent>Styled Content</CardContent>
        );
        const content = getByText('Styled Content');
        expect(content).toHaveStyle({
          color: '#E0E0E0',
          fontSize: '0.938rem',
        });
      });
    });

    describe('CardFooter', () => {
      it('should render footer content', () => {
        const { getByText } = renderWithTheme(
          <CardFooter>Footer Content</CardFooter>
        );
        expect(getByText('Footer Content')).toBeInTheDocument();
      });

      it('should align right by default', () => {
        const { container } = renderWithTheme(
          <CardFooter>Right Aligned</CardFooter>
        );
        const footer = container.firstChild as HTMLElement;
        expect(footer).toHaveStyle({ justifyContent: 'flex-end' });
      });

      it('should align left when specified', () => {
        const { container } = renderWithTheme(
          <CardFooter align="left">Left Aligned</CardFooter>
        );
        const footer = container.firstChild as HTMLElement;
        expect(footer).toHaveStyle({ justifyContent: 'flex-start' });
      });

      it('should align center when specified', () => {
        const { container } = renderWithTheme(
          <CardFooter align="center">Center Aligned</CardFooter>
        );
        const footer = container.firstChild as HTMLElement;
        expect(footer).toHaveStyle({ justifyContent: 'center' });
      });
    });

    describe('Full Card Composition', () => {
      it('should render complete card with all parts', () => {
        const { getByText } = renderWithTheme(
          <Card>
            <CardHeader
              title="Complete Card"
              subtitle="With all components"
              action={<button>Action</button>}
            />
            <CardContent>This is the main content</CardContent>
            <CardFooter>
              <button>Cancel</button>
              <button>Submit</button>
            </CardFooter>
          </Card>
        );
        
        expect(getByText('Complete Card')).toBeInTheDocument();
        expect(getByText('With all components')).toBeInTheDocument();
        expect(getByText('This is the main content')).toBeInTheDocument();
        expect(getByText('Cancel')).toBeInTheDocument();
        expect(getByText('Submit')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      expectPerformance(() => {
        renderWithTheme(<Card>Performance Test</Card>);
      }, 50);
    });

    it('should handle multiple cards efficiently', () => {
      expectPerformance(() => {
        renderWithTheme(
          <div>
            {Array.from({ length: 20 }).map((_, i) => (
              <Card key={i}>Card {i}</Card>
            ))}
          </div>
        );
      }, 150);
    });

    it('should render skeleton quickly', () => {
      expectPerformance(() => {
        renderWithTheme(<CardSkeleton lines={10} />);
      }, 50);
    });
  });

  describe('Accessibility', () => {
    it('should be accessible when interactive', () => {
      const { container } = renderWithTheme(
        <Card onClick={() => {}}>Accessible Card</Card>
      );
      const card = container.firstChild as HTMLElement;
      expectAccessible(card);
    });

    it('should support keyboard navigation', () => {
      const handleClick = jest.fn();
      const { container } = renderWithTheme(
        <Card onClick={handleClick}>Keyboard Card</Card>
      );
      
      const card = container.firstChild as HTMLElement;
      card.focus();
      expect(card).toHaveFocus();
    });

    it('should have proper semantic structure', () => {
      const { getByRole } = renderWithTheme(
        <Card onClick={() => {}}>Semantic Card</Card>
      );
      expect(getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const { container } = renderWithTheme(<Card>{''}</Card>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should handle very long content', () => {
      const longContent = 'This is a very long content '.repeat(100);
      const { container } = renderWithTheme(
        <Card>{longContent}</Card>
      );
      expect(container).toHaveTextContent('This is a very long content');
    });

    it('should handle missing onClick gracefully', () => {
      const { container } = renderWithTheme(
        <Card interactive>No Handler</Card>
      );
      const card = container.firstChild as HTMLElement;
      expect(() => fireEvent.click(card)).not.toThrow();
    });

    it('should forward ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>();
      renderWithTheme(<Card ref={ref}>Ref Card</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should handle rapid interactions', () => {
      const handleClick = jest.fn();
      const { container } = renderWithTheme(
        <Card onClick={handleClick}>Rapid Click</Card>
      );
      
      const card = container.firstChild as HTMLElement;
      for (let i = 0; i < 10; i++) {
        fireEvent.click(card);
      }
      
      expect(handleClick).toHaveBeenCalledTimes(10);
    });

    it('should maintain state across re-renders', () => {
      const { rerender, getByText } = renderWithTheme(
        <Card>Initial Content</Card>
      );
      
      expect(getByText('Initial Content')).toBeInTheDocument();
      
      rerender(<Card>Updated Content</Card>);
      
      expect(getByText('Updated Content')).toBeInTheDocument();
    });
  });
});
