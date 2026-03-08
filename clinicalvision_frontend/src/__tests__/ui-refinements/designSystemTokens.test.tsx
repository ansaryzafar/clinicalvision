/**
 * Design System Tokens Test
 * 
 * Validates that lunitDesignSystem.ts exports the required tokens
 * for button, card, and dropdown enhancements.
 */

import {
  lunitColors,
  lunitShadows,
  lunitTransitions,
  lunitRadius,
  lunitButtonStyles,
  lunitCardBase,
  lunitAnimations,
  lunitButtonPrimary,
  lunitButtonOutlined,
  lunitButtonAccent,
} from '../../styles/lunitDesignSystem';

describe('Design System — Enhanced Tokens', () => {
  // ── Shadow Tokens ──
  describe('lunitShadows', () => {
    it('exports base card shadows', () => {
      expect(lunitShadows.card).toBeDefined();
      expect(lunitShadows.cardHover).toBeDefined();
      expect(lunitShadows.cardHoverTeal).toBeDefined();
    });

    it('exports colored card hover shadow variants', () => {
      expect(lunitShadows.cardHoverOrange).toContain('#FF9800');
      expect(lunitShadows.cardHoverRed).toContain('#F44336');
      expect(lunitShadows.cardHoverGreen).toContain('#22C55E');
    });

    it('exports button hover shadows', () => {
      expect(lunitShadows.buttonHoverTeal).toContain('rgba(0, 201, 234');
      expect(lunitShadows.buttonHoverSubtle).toContain('rgba(0, 201, 234');
    });

    it('exports dropdown shadow', () => {
      expect(lunitShadows.dropdown).toBeDefined();
      expect(lunitShadows.dropdown).toContain('rgba(35, 50, 50');
    });

    it('colored shadows follow the top-edge + depth structure', () => {
      // Each colored shadow should have a -3px top-edge and a 10px 40px depth component
      expect(lunitShadows.cardHoverTeal).toMatch(/0 -3px 0 0/);
      expect(lunitShadows.cardHoverOrange).toMatch(/0 -3px 0 0/);
      expect(lunitShadows.cardHoverRed).toMatch(/0 -3px 0 0/);
      expect(lunitShadows.cardHoverGreen).toMatch(/0 -3px 0 0/);
    });
  });

  // ── Transition Tokens ──
  describe('lunitTransitions', () => {
    it('exports the smooth cubic-bezier transition', () => {
      expect(lunitTransitions.smooth).toBe('all 0.35s cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('smooth matches card transition easing', () => {
      // The smooth transition should use the same cubic-bezier as card
      expect(lunitTransitions.smooth).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
      expect(lunitTransitions.card).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    });
  });

  // ── Button Styles ──
  describe('lunitButtonStyles.common', () => {
    it('uses fontWeight 600 (semi-bold)', () => {
      expect(lunitButtonStyles.common.fontWeight).toBe(600);
    });

    it('uses the smooth cubic-bezier transition', () => {
      expect(lunitButtonStyles.common.transition).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('uses pill border-radius (100px)', () => {
      expect(lunitButtonStyles.common.borderRadius).toBe(lunitRadius.full);
      expect(lunitRadius.full).toBe('100px');
    });

    it('includes an active press state', () => {
      const common = lunitButtonStyles.common;
      const activeState = common['&:active'];
      expect(activeState).toBeDefined();
      expect(activeState.transform).toContain('scale(0.98)');
    });

    it('includes a focus-visible ring', () => {
      const common = lunitButtonStyles.common;
      const focusState = common['&:focus-visible'];
      expect(focusState).toBeDefined();
      expect(focusState.outline).toContain('#00C9EA');
    });

    it('includes endIcon transition for arrow animation', () => {
      const common = lunitButtonStyles.common;
      const iconStyle = common['& .MuiButton-endIcon'];
      expect(iconStyle).toBeDefined();
      expect(iconStyle.transition).toContain('transform');
    });
  });

  // ── Card Base Mixin ──
  describe('lunitCardBase', () => {
    it('exports the unified card base mixin', () => {
      expect(lunitCardBase).toBeDefined();
    });

    it('uses white background', () => {
      expect(lunitCardBase.bgcolor).toBe(lunitColors.white);
    });

    it('uses 2xl border radius (20px)', () => {
      expect(lunitCardBase.borderRadius).toBe(lunitRadius['2xl']);
    });

    it('uses the smooth cubic-bezier transition', () => {
      expect(lunitCardBase.transition).toContain('cubic-bezier(0.4, 0, 0.2, 1)');
    });

    it('applies translateY(-6px) + teal glow on hover', () => {
      const hoverState = lunitCardBase['&:hover'];
      expect(hoverState.transform).toBe('translateY(-6px)');
      expect(hoverState.boxShadow).toBe(lunitShadows.cardHoverTeal);
    });
  });

  // ── Color Palette Completeness ──
  describe('lunitColors', () => {
    it('has teal brand colors', () => {
      expect(lunitColors.teal).toBe('#00C9EA');
      expect(lunitColors.tealDarker).toBe('#0F95AB');
    });

    it('has accent colors for clinical urgency levels', () => {
      expect(lunitColors.orange).toBe('#FF5321');
      expect(lunitColors.red).toBe('#FF4444');
      expect(lunitColors.green).toBe('#56C14D');
    });
  });

  // ── Button Variant Mixins ──
  describe('Button Variant Mixins', () => {
    it('exports lunitButtonPrimary with black bg and teal hover', () => {
      expect(lunitButtonPrimary).toBeDefined();
      expect(lunitButtonPrimary.bgcolor).toBe(lunitColors.black);
      expect(lunitButtonPrimary.color).toBe(lunitColors.white);
      expect(lunitButtonPrimary['&:hover']).toBeDefined();
      expect(lunitButtonPrimary['&:focus-visible']).toBeDefined();
    });

    it('exports lunitButtonOutlined with border and inverted hover', () => {
      expect(lunitButtonOutlined).toBeDefined();
      expect(lunitButtonOutlined.bgcolor).toBe('transparent');
      expect(lunitButtonOutlined.border).toContain(lunitColors.black);
      expect(lunitButtonOutlined['&:hover']).toBeDefined();
      expect(lunitButtonOutlined['&:focus-visible']).toBeDefined();
    });

    it('exports lunitButtonAccent with teal bg', () => {
      expect(lunitButtonAccent).toBeDefined();
      expect(lunitButtonAccent.bgcolor).toBe(lunitColors.teal);
      expect(lunitButtonAccent['&:hover']).toBeDefined();
      expect(lunitButtonAccent['&:focus-visible']).toBeDefined();
    });

    it('all variant mixins include active press and focus-visible', () => {
      [lunitButtonPrimary, lunitButtonOutlined, lunitButtonAccent].forEach(mixin => {
        expect(mixin['&:active']).toBeDefined();
        expect(mixin['&:active'].transform).toContain('scale(0.98)');
        expect(mixin['&:focus-visible'].outline).toContain('#00C9EA');
      });
    });
  });

  // ── Animation Keyframes ──
  describe('Animation Keyframes', () => {
    it('exports dropdownEnter animation keyframes', () => {
      expect(lunitAnimations.dropdownEnter).toBeDefined();
      expect(lunitAnimations.dropdownEnter['0%'].transform).toContain('translateY(-8px)');
      expect(lunitAnimations.dropdownEnter['100%'].transform).toContain('scale(1)');
    });

    it('exports itemSlideIn animation keyframes', () => {
      expect(lunitAnimations.itemSlideIn).toBeDefined();
      expect(lunitAnimations.itemSlideIn['0%'].transform).toContain('translateX(-8px)');
    });

    it('exports statusPulse animation keyframes', () => {
      expect(lunitAnimations.statusPulse).toBeDefined();
      expect(lunitAnimations.statusPulse['50%'].opacity).toBe(0.4);
    });

    it('exports iconPulse animation keyframes', () => {
      expect(lunitAnimations.iconPulse).toBeDefined();
      expect(lunitAnimations.iconPulse['50%'].transform).toContain('scale(1.15)');
    });
  });
});
