import mongoose from 'mongoose';
import { assert } from './ApiError.js';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requiredString(value, label, { max = 5000, min = 1 } = {}) {
  const clean = typeof value === 'string' ? value.trim() : '';
  assert(clean.length >= min, 422, `${label} is required.`);
  assert(clean.length <= max, 422, `${label} cannot exceed ${max} characters.`);
  return clean;
}

export function optionalString(value, label, { max = 5000 } = {}) {
  if (value === undefined) return undefined;
  const clean = typeof value === 'string' ? value.trim() : '';
  assert(clean.length <= max, 422, `${label} cannot exceed ${max} characters.`);
  return clean;
}

export function validEmail(value) {
  const email = requiredString(value, 'Email', { max: 160 }).toLowerCase();
  assert(EMAIL_REGEX.test(email), 422, 'Please provide a valid email address.');
  return email;
}

export function validPassword(value, label = 'Password') {
  const password = typeof value === 'string' ? value : '';
  assert(password.length >= 8, 422, `${label} must be at least 8 characters.`);
  assert(password.length <= 128, 422, `${label} cannot exceed 128 characters.`);
  return password;
}

export function validObjectId(value, label = 'id') {
  assert(mongoose.isValidObjectId(value), 404, `${label} was not found.`);
  return value;
}

export function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedLimit = Number.parseInt(query.limit, 10) || 10;
  const limit = Math.min(100, Math.max(1, requestedLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function validDate(value, label = 'Deadline') {
  assert(value !== undefined && value !== null && value !== '', 422, `${label} is required.`);
  const date = new Date(value);
  assert(!Number.isNaN(date.getTime()), 422, `${label} must be a valid date and time.`);
  return date;
}

// Accepts an optional date/time. undefined/'' /null all mean "not provided" and
// return null, so existing API callers without the field keep working.
export function validOptionalDate(value, label) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  assert(!Number.isNaN(date.getTime()), 422, `${label} must be a valid date and time.`);
  return date;
}

export function validResourceUrl(value) {
  const url = requiredString(value, 'Resource URL', { max: 2048 });
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    assert(false, 422, 'Resource URL must be a valid http or https URL.');
  }
  assert(
    parsed.protocol === 'http:' || parsed.protocol === 'https:',
    422,
    'Resource URL must start with http:// or https://.'
  );
  return url;
}

export function normalizeResources(resources) {
  if (resources === undefined) return undefined;
  assert(Array.isArray(resources), 422, 'Resources must be an array.');
  assert(resources.length <= 10, 422, 'A task can have at most 10 resources.');
  return resources.map((resource, index) => {
    assert(resource && typeof resource === 'object', 422, `Resource ${index + 1} is invalid.`);
    const label = requiredString(resource.label, `Resource ${index + 1} label`, { max: 120 });
    const url = validResourceUrl(resource.url);
    const type = resource.type || 'link';
    assert(['link', 'image'].includes(type), 422, 'Resource type must be link or image.');
    return { label, url, type };
  });
}

export function validEnum(value, allowed, label) {
  assert(allowed.includes(value), 422, `${label} must be one of: ${allowed.join(', ')}.`);
  return value;
}

export function validBoolean(value, label) {
  assert(typeof value === 'boolean', 422, `${label} must be true or false.`);
  return value;
}
