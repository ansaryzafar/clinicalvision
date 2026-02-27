import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop Component
 * 
 * Automatically scrolls to the top of the page when the route changes.
 * This fixes the UX issue where navigating to a new page would show
 * the bottom of the page instead of the top.
 * 
 * Place this component inside the Router but outside of Routes.
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when pathname changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior, // Use 'instant' for immediate scroll, 'smooth' for animated
    });
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default ScrollToTop;
