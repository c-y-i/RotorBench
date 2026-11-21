export function cloneBuild(build, id, name, now = new Date().toISOString()) {
  return {
    ...build,
    id,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

export function renameBuild(build, name, now = new Date().toISOString()) {
  return {
    ...build,
    name,
    updatedAt: now,
  };
}

export function upsertBuild(builds, build) {
  const list = Array.isArray(builds) ? builds : [];
  const index = list.findIndex((item) => item.id === build.id);
  if (index < 0) return [build, ...list];
  const next = [...list];
  next[index] = build;
  return next;
}

export function copyHardwarePlans(
  sourceId,
  targetId,
  storage = typeof window !== "undefined" ? window.localStorage : null,
) {
  if (!sourceId || !targetId || !storage) return 0;
  let copied = 0;
  for (const plan of ["fc", "radio"]) {
    const sourceKey = `rotorbench:hardware-plan:${sourceId}:${plan}`;
    const targetKey = `rotorbench:hardware-plan:${targetId}:${plan}`;
    try {
      const value = storage.getItem(sourceKey);
      if (!value) continue;
      storage.setItem(targetKey, value);
      copied += 1;
    } catch {
      // A blocked or full browser store must not prevent build duplication.
    }
  }
  return copied;
}
