import { readJsonStorage, writeJsonStorage } from "./storage";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test("safe storage reads JSON and removes malformed values", () => {
  const storage = memoryStorage({
    valid: '{"ok":true}',
    broken: "{",
  });
  expect(readJsonStorage("valid", null, storage)).toEqual({ ok: true });
  expect(readJsonStorage("broken", { fallback: true }, storage)).toEqual({
    fallback: true,
  });
  expect(storage.values.has("broken")).toBe(false);
});

test("safe storage handles unavailable or failing backends", () => {
  const failing = {
    getItem: () => { throw new Error("blocked"); },
    setItem: () => { throw new Error("blocked"); },
    removeItem: () => { throw new Error("blocked"); },
  };
  expect(readJsonStorage("key", 7, failing)).toBe(7);
  expect(writeJsonStorage("key", { value: 1 }, failing)).toBe(false);
  expect(writeJsonStorage("key", { value: 1 }, null)).toBe(false);

  const storage = memoryStorage();
  expect(writeJsonStorage("key", { value: 1 }, storage)).toBe(true);
  expect(storage.values.get("key")).toBe('{"value":1}');
  expect(writeJsonStorage("key", null, storage)).toBe(true);
  expect(storage.values.has("key")).toBe(false);
});
