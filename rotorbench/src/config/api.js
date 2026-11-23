/**
 * API base URL strategy:
 * - Production default: same-origin (empty string) so requests go to /api
 * - Development default: localhost backend
 * - Override with VITE_API_BASE when needed
 */

const normalizeBase = (value) => {
  if (!value) return null;
  return value.trim().replace(/\/+$/, "");
};

const envBase = normalizeBase(import.meta.env.VITE_API_BASE);
const API_BASE =
  envBase || (import.meta.env.DEV ? "http://localhost:8000" : "");

export default API_BASE;
