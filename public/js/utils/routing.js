/**
 * Get hash path fragment, defaulting to create route.
 * Reads but does not mutate browser state.
 * @returns {string}
 */
export function hash() {
  return location.hash.split('?')[0] || '#/create';
}

/**
 * Parse query parameters from the hash fragment into an object.
 * Returns an empty object when no query string is present.
 * @returns {Record<string, string>}
 */
export function qs() {
  return Object.fromEntries(
    new URLSearchParams(location.hash.split('?')[1] || '')
  );
}
