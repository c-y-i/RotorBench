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
    id: "source-5",
    name: "5-inch Source One V5 source build",
    description: "TBS Source One V5, XING2 2207 1855KV, HQProp 5037, SpeedyBee 50A, Kakute H7 V2, Tattu 6S",
    componentIds: {
      frameId: "frame-tbs-source-one-v5",
      motorId: "motor-iflight-xing2-2207-1855kv",
      propellerId: "prop-hqprop-pizzacutters-5037-3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-tattu-rline-v3-6s-1050-120c",
      receiverId: "rx-radiomaster-rp4td",
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
  {
    id: "source-55-xing2",
    name: "5.5-inch XING2 6S build",
    description: "AOS 5.5, XING2 2207 1855KV, HQ R42, Mamba F55A, Kakute H7 V2, RP4TD, Tattu 6S",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-iflight-xing2-2207-1855kv",
      propellerId: "prop-hq-r42-51x42x3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-tattu-rline-v3-6s-1050-120c",
      receiverId: "rx-radiomaster-rp4td",
    },
  },
  {
    id: "source-55-xing2-4s",
    name: "5.5-inch XING2 4S build",
    description: "AOS 5.5, XING2 2207 2755KV, HQ R42, SpeedyBee 50A stack, Kakute H7 V2, RP4TD, CNHL 4S",
    componentIds: {
      frameId: "frame-aos-55-v2",
      motorId: "motor-iflight-xing2-2207-2755kv",
      propellerId: "prop-hq-r42-51x42x3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-cnhl-black-4s-1500-100c",
      receiverId: "rx-radiomaster-rp4td",
    },
  },
  {
    id: "source-7-inch",
    name: "7-inch long-range source build",
    description: "AOS 7 EVO V1.2, XING 2806.5 1300KV, Gemfan 7040, SpeedyBee 50A, Kakute H7 V2, Tattu 6S",
    componentIds: {
      frameId: "frame-aos-7-evo-v12",
      motorId: "motor-iflight-xing-2806-5-1300kv",
      propellerId: "prop-gemfan-flash-7040-3",
      escId: "esc-speedybee-bl32-50a",
      flightControllerId: "fc-holybro-kakute-h7-v2",
      batteryId: "battery-tattu-rline-6s-1300-120c",
      receiverId: "rx-radiomaster-rp4td",
    },
  },
  {
    id: "source-25",
    name: "2.5-inch AOS Cine25 source build",
    description: "AOS Cine25 V5, F1404 4600KV, Gemfan 2520, SpeedyBee 35A stack, Tattu 4S",
    componentIds: {
      frameId: "frame-aos-cine25-v5",
      motorId: "motor-tmotor-f1404-4600kv",
      propellerId: "prop-gemfan-hurricane-2520-3",
      escId: "esc-speedybee-bls-35a-mini-v2",
      flightControllerId: "fc-speedybee-f405-mini",
      batteryId: "battery-tattu-rline-4s-850-95c",
      receiverId: "rx-radiomaster-rp4td",
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
