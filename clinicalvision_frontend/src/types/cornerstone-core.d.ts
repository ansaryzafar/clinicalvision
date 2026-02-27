/**
 * Cornerstone Core - Extended Type Declarations
 * 
 * The @types/cornerstone-core package is missing some methods that
 * cornerstone-core actually exports at runtime. This declaration
 * extends the module to include those methods.
 */

import 'cornerstone-core';

declare module 'cornerstone-core' {
  /**
   * Force a re-render of an image displayed in an enabled element.
   * This is commonly used after programmatic viewport changes.
   */
  export function updateImage(element: HTMLElement, invalidated?: boolean): void;
}
