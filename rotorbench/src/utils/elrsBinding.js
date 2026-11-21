import md5 from "blueimp-md5";

const PHRASE_PREFIX = '-DMY_BINDING_PHRASE="';
const PHRASE_SUFFIX = '"';

export function phraseByteLength(phrase = "") {
  let bytes = 0;
  for (const character of String(phrase || "")) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 0x7f) bytes += 1;
    else if (codePoint <= 0x7ff) bytes += 2;
    else if (codePoint <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

export function deriveUidFromPhrase(phrase = "") {
  if (!phrase) return "00:00:00:00:00:00";
  const input = `${PHRASE_PREFIX}${phrase}${PHRASE_SUFFIX}`;
  const raw = md5(input, null, true);
  return Array.from(raw.slice(0, 6), (character) =>
    character.charCodeAt(0).toString(16).padStart(2, "0")
  ).join(":");
}

export function normalizeUidText(value = "") {
  const compact = String(value || "").replace(/[^0-9a-f]/gi, "").toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(compact)) return "";
  return compact.match(/.{2}/g).join(":");
}

export function getBindingIdentity(config = {}) {
  const phrase = String(config.bindingPhrase || "").trim();
  const directUid = normalizeUidText(config.uid);
  const identityUid = phrase ? deriveUidFromPhrase(phrase) : directUid;
  return {
    source: phrase ? "phrase" : directUid ? "uid" : "unbound",
    phraseBytes: phraseByteLength(phrase),
    uid: identityUid || "00:00:00:00:00:00",
    unbound: !identityUid || identityUid === "00:00:00:00:00:00",
  };
}
