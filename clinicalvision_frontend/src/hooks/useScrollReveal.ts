/**
 * Shared scroll-reveal utilities for section entrance animations.
 *
 * Uses IntersectionObserver to detect when an element enters the viewport
 * and triggers a one-time animation (unobserves after first intersection).
 */

import React, { useEffect, useRef, useState } from 'react';

export const useScrollReveal = (threshold = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold, rootMargin: '0px 0px -50px 0px' },
    );

    const currentRef = ref.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [threshold]);

  return { ref, isVisible };
};

/**
 * ScrollReveal wrapper component.
 * Wraps children in a div that fades-up on scroll.
 *
 * Usage:
 *   <ScrollReveal>
 *     <Box sx={{ ... }}>content</Box>
 *   </ScrollReveal>
 */
interface ScrollRevealProps {
  children: React.ReactNode;
  threshold?: number;
  delay?: string;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  threshold = 0.1,
  delay = '0s',
}) => {
  const { ref, isVisible } = useScrollReveal(threshold);

  return React.createElement(
    'div',
    {
      ref,
      style: {
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.8s ease-out ${delay}, transform 0.8s ease-out ${delay}`,
      },
    },
    children,
  );
};
