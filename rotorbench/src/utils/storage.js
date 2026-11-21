function defaultStorage() {
  return typeof window !== "undefined" ? window.localStorage : null;
}

export function readJsonStorage(key, fallback = null, storage = defaultStorage()) {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // A blocked storage backend should still degrade to the fallback.
    }
    return fallback;
  }
}

export function writeJsonStorage(key, value, storage = defaultStorage()) {
  if (!storage) return false;
  try {
    if (value == null) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
