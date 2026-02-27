/**
 * Routes Module — Public API
 * 
 * Barrel export for all routing infrastructure.
 * Import from 'routes' or 'routes/paths' for constants.
 * 
 * @example
 * import { ROUTES, DEFAULT_AUTH_REDIRECT } from '../routes';
 * import AppRoutes from '../routes/AppRoutes';
 */

export { ROUTES, LEGACY_REDIRECTS, SIDEBAR_ROUTES, DEFAULT_AUTH_REDIRECT, LOGOUT_REDIRECT, LOGIN_REDIRECT } from './paths';
export type { AppRoute } from './paths';
export { routeConfig } from './routeConfig';
export type { RouteEntry } from './routeConfig';
export { default as AppRoutes } from './AppRoutes';
