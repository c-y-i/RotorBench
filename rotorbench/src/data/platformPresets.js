import componentsData from "./components.json";

export const PLATFORM_PRESETS = [
  {
    id: "source-35",
    name: "3.5-inch source build",
    description: "AOS V5.1, F1404, Gemfan 3520, SpeedyBee Mini stack, Tattu 4S",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-3800kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp1-v2",
    },
  },
  {
    id: "source-55",
    name: "5.5-inch source build",
    description: "AOS 5.5, EMAX 2207, HQ R42, SpeedyBee stack, Tattu 6S",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-emax-eco-ii-2207-1900kv",
      propellerId: "prop-hq-r42-51x42x3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-speedybee-f405-v4",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      receiverId: "rx-radiomaster-rp3-h",
    },
  },
  {
    id: "source-55-diversity",
    name: "5.5-inch diversity source build",
    description: "AOS 5.5, EMAX 2207, HQ R42, Kakute H7 V2, RP4TD Diversity, Tattu 6S",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-emax-eco-ii-2207-1900kv",
      propellerId: "prop-hq-r42-51x42x3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      receiverId: "rx-radiomaster-rp4td",
    },
  },
  {
    id: "source-35-4600",
    name: "3.5-inch 4600KV source build",
    description: "AOS V5.1, F1404 4600KV, Gemfan 3520, SpeedyBee Mini stack, Tattu 4S",
    componentIds: {
      frameId: "frame-aos-35-v51",
      motorId: "motor-tmotor-f1404-4600kv",
      propellerId: "prop-gemfan-hurricane-3520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp2-v2",
    },
  },
];

const idCategory = {
  frameId: "frames",
  motorId: "motors",
  propellerId: "propellers",
  escId: "escs",
  flightControllerId: "flight_controllers",
  batteryId: "batteries",
  receiverId: "receivers",
};

export function getPlatformPreset(id) {
  return PLATFORM_PRESETS.find((preset) => preset.id === id) || null;
}

export function validatePlatformPreset(preset, catalog = componentsData) {
  if (!preset?.componentIds) return false;
  return Object.entries(idCategory).every(([key, category]) => {
    const id = preset.componentIds[key];
    return Boolean(id && catalog[category]?.some((part) => part.id === id));
  });
}

export function matchesPlatformPreset(preset, componentIds = {}) {
  if (!preset?.componentIds) return false;
  return Object.entries(preset.componentIds).every(
    ([key, id]) => componentIds[key] === id,
  );
}
