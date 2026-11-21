import {
  deriveUidFromPhrase,
  getBindingIdentity,
  normalizeUidText,
  phraseByteLength,
} from "./elrsBinding";

test("derives the first six MD5 bytes exactly as ExpressLRS and Aerial Kit do", () => {
  expect(deriveUidFromPhrase("local-test-phrase")).toBe("83:63:42:33:50:ab");
  expect(deriveUidFromPhrase("shared phrase")).toBe("4b:14:f7:91:aa:dc");
  expect(deriveUidFromPhrase("")).toBe("00:00:00:00:00:00");
});

test("normalizes a direct six-byte UID", () => {
  expect(normalizeUidText("1073a11fa80f")).toBe("10:73:a1:1f:a8:0f");
  expect(normalizeUidText("10-73-A1-1F-A8-0F")).toBe("10:73:a1:1f:a8:0f");
  expect(normalizeUidText("1234")).toBe("");
});

test("reports phrase length and the staged identity source", () => {
  expect(phraseByteLength("RotorBench bench")).toBe(16);
  expect(getBindingIdentity({ bindingPhrase: "local-test-phrase" })).toEqual({
    source: "phrase",
    phraseBytes: 17,
    uid: "83:63:42:33:50:ab",
    unbound: false,
  });
  expect(getBindingIdentity({ uid: "10-73-A1-1F-A8-0F" })).toEqual({
    source: "uid",
    phraseBytes: 0,
    uid: "10:73:a1:1f:a8:0f",
    unbound: false,
  });
});
