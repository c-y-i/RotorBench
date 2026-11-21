import {
  BUILD_LINK_SCHEMA,
  buildShareUrl,
  createBuildShareToken,
  parseBuildShareToken,
} from "./buildLink";

const build = {
  componentIds: {
    frameId: "frame-aos-35-v51",
    motorId: "motor-tmotor-f1404-3800kv",
    propellerId: "prop-gemfan-hurricane-3520-3",
    batteryId: "battery-tattu-rline-4s-850-95c",
    escId: "esc-speedybee-bls-35a-mini-v2",
    flightControllerId: "fc-speedybee-f405-mini",
    receiverId: "rx-radiomaster-rp4td",
  },
  geometryOverrides: {
    schema: "rotorbench.measured-geometry.v1",
    categories: {
      motors: {
        "motor-tmotor-f1404-3800kv": {
          dimensionsMm: [18.1, 17, 18.1],
        },
        "motor-not-selected": {
          dimensionsMm: [99, 99, 99],
        },
      },
    },
  },
  note: "Sensitive build context",
  hardwarePlan: { bindingPhrase: "secret", uid: "aa:bb:cc:dd:ee:ff" },
};

test("round-trips catalog IDs and selected-part measurements only", () => {
  const token = createBuildShareToken(build);
  const parsed = parseBuildShareToken(token);

  expect(parsed.schema).toBe(BUILD_LINK_SCHEMA);
  expect(parsed.componentIds).toEqual(build.componentIds);
  expect(parsed.geometryOverrides.categories).toEqual({
    motors: {
      "motor-tmotor-f1404-3800kv": {
        dimensionsMm: [18.1, 17, 18.1],
      },
    },
  });
  expect(JSON.stringify(parsed)).not.toContain("Sensitive build context");
  expect(JSON.stringify(parsed)).not.toContain("secret");
  expect(JSON.stringify(parsed)).not.toContain("aa:bb:cc");
});

test("creates a portable absolute build URL", () => {
  expect(buildShareUrl(build, { origin: "https://bench.example" })).toMatch(
    /^https:\/\/bench\.example\/build\?share=[A-Za-z0-9_-]+$/,
  );
});

test("rejects unknown products, malformed tokens, and unsupported schemas", () => {
  expect(() => createBuildShareToken({
    componentIds: { frameId: "frame-missing" },
  })).toThrow(/unknown component/i);
  expect(() => parseBuildShareToken("not*base64")).toThrow(/invalid encoding/i);
  expect(() => parseBuildShareToken("bm90LWpzb24"))
    .toThrow(/malformed|unsupported/i);
});
