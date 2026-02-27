/**
 * Cornerstone Tools - Extended Type Declarations
 * 
 * The @types/cornerstone-tools package is missing some methods.
 * This declaration extends the module.
 */

import 'cornerstone-tools';

declare module 'cornerstone-tools' {
  /**
   * Get the tool instance bound to a specific element.
   * Returns undefined if no tool is found.
   */
  export function getToolForElement(element: HTMLElement, toolName: string): unknown;
}
