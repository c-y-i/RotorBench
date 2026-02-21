/**
 * API base URL strategy:
 * - Production default: same-origin (empty string) so requests go to /api
 * - Development default: localhost backend
 * - Override with REACT_APP_API_BASE when needed
 */

const normalizeBase = (value) => {
  if (!value) return null;
  return value.trim().replace(/\/+$/, "");
};

const envBase = normalizeBase(process.env.REACT_APP_API_BASE);
const API_BASE =
  envBase || (process.env.NODE_ENV === "development" ? "http://localhost:8000" : "");

export default API_BASE;
