/**
 * Normalizes a base URL into a valid React Router basename.
 * Strips any trailing slashes unless it is root '/'.
 * Defaults to '/' if empty or falsy.
 *
 * @param {string} [baseUrl='']
 * @returns {string}
 */
export function getRouterBasename(baseUrl = '') {
  if (!baseUrl || typeof baseUrl !== 'string') return '/';
  const trimmed = baseUrl.trim();
  if (trimmed === '' || trimmed === '/') return '/';
  return trimmed.replace(/\/+$/, '') || '/';
}
