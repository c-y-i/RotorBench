import {
  cloneBuild,
  copyHardwarePlans,
  renameBuild,
  upsertBuild,
} from "./savedBuilds";

const build = {
  id: "build-old",
  name: "Original",
  componentIds: { frameId: "frame-1" },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test("build duplication creates a new identity and preserves component selections", () => {
  const clone = cloneBuild(build, "build-new", "Original copy", "2026-02-01T00:00:00.000Z");
  expect(clone).toMatchObject({
    id: "build-new",
    name: "Original copy",
    componentIds: build.componentIds,
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  });
  expect(clone).not.toBe(build);
});

test("rename updates only the name and modified time", () => {
  const renamed = renameBuild(build, "Renamed", "2026-02-02T00:00:00.000Z");
  expect(renamed).toMatchObject({
    id: "build-old",
    name: "Renamed",
    componentIds: build.componentIds,
    createdAt: build.createdAt,
    updatedAt: "2026-02-02T00:00:00.000Z",
  });
});

test("duplicating a build copies existing local hardware plans", () => {
  const storage = {
    values: new Map([
      ["rotorbench:hardware-plan:build-old:fc", '{"planVersion":3}'],
      ["rotorbench:hardware-plan:build-old:radio", '{"planVersion":3}'],
    ]),
    getItem(key) {
      return this.values.get(key) || null;
    },
    setItem(key, value) {
      this.values.set(key, value);
    },
  };
  expect(copyHardwarePlans("build-old", "build-new", storage)).toBe(2);
  expect(storage.getItem("rotorbench:hardware-plan:build-new:fc"))
    .toBe('{"planVersion":3}');
  expect(storage.getItem("rotorbench:hardware-plan:build-new:radio"))
    .toBe('{"planVersion":3}');
});

test("saving a build upserts instead of creating accidental duplicates", () => {
  const existing = [
    { id: "build-a", name: "First" },
    { id: "build-b", name: "Second" },
  ];
  expect(upsertBuild(existing, { id: "build-a", name: "Updated" })).toEqual([
    { id: "build-a", name: "Updated" },
    { id: "build-b", name: "Second" },
  ]);
  expect(upsertBuild(existing, { id: "build-c", name: "Third" })[0]).toEqual({
    id: "build-c",
    name: "Third",
  });
});
