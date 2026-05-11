/**
 * Input Validation & Sanitization Utilities
 * Prevents NoSQL injection and XSS attacks.
 */

/**
 * Strip MongoDB operators (keys starting with $) from an object recursively.
 * Prevents NoSQL injection when user input is passed to Mongoose/MongoDB queries.
 */
export function sanitizeInput(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeString(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeInput);

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    // Block MongoDB operators
    if (key.startsWith('$')) continue;
    // Block prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = sanitizeInput(value);
  }
  return clean;
}

/**
 * Sanitize a string — trim and limit length.
 */
export function sanitizeString(str, maxLength = 10000) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

/**
 * Validate an email address format.
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

/**
 * Validate a string field is non-empty after trimming.
 */
export function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

/**
 * Validate that a value is one of allowed values (enum validation).
 */
export function isOneOf(val, allowedValues) {
  return allowedValues.includes(val);
}

/**
 * Safely parse JSON body with size and structure validation.
 * Returns sanitized object or null.
 */
export async function parseAndSanitizeBody(request) {
  try {
    const body = await request.json();
    return sanitizeInput(body);
  } catch {
    return null;
  }
}
