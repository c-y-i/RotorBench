// Type definitions for drone components
// These types support the analysis feature calculations

export interface Motor {
  id: string;
  name: string;
  kv: number; // RPM per volt
  weight: number; // grams
  maxCurrent: number; // amps
  voltage: {
    min: number;
    max: number;
  };
  size: string; // e.g., "2207", "2306"
  price: number;
}

export interface Propeller {
  id: string;
  name: string;
  size: number; // inches
  pitch: number; // inches
  bladeCount: number;
  weight: number; // grams per prop
  material: string; // e.g., "Carbon Fiber", "Plastic"
  price: number;
  // Thrust characteristics for different motor KV ranges
  thrustData: {
    kv: number; // Motor KV this data applies to
    thrust: number; // grams of thrust at full throttle
  }[];
}

export interface ESC {
  id: string;
  name: string;
  manufacturer: string; // Keep manufacturer for ESC
  currentRating: number; // continuous amps
  burstCurrent: number; // amps
  weight: number; // grams
  mounting_point?: [number, number, number]; // offset from model origin
  voltage: {
    min: number; // e.g., 2S
    max: number; // e.g., 6S
  };
  protocol: string[]; // e.g., ["DShot600", "Multishot"]
  price: number;
}

export interface FlightController {
  id: string;
  name: string;
  manufacturer: string; // Keep manufacturer for FC
  processor: string;
  weight: number; // grams
  mounting_point?: [number, number, number];
  firmware: string[]; // e.g., ["Betaflight", "INAV"]
  imu: string; // e.g., "MPU6000"
  maxVoltage: number;
  features: string[]; // e.g., ["OSD", "Blackbox", "Barometer"]
  price: number;
}

export interface Frame {
  id: string;
  name: string;
  size: number; // wheelbase in mm
  weight: number; // grams
  material: string; // e.g., "Carbon Fiber"
  motorCount: number; // typically 4
  maxPropSize: number; // inches
  stackHeight: number; // mm (mounting hole spacing)
  price: number;
}

export interface Battery {
  id: string;
  name: string;
  capacity: number; // mAh
  voltage: number; // nominal voltage (cells * 3.7V)
  cells: number; // S count (e.g., 4 for 4S)
  cRating: number; // discharge rate
  weight: number; // grams
  mounting_point?: [number, number, number]; // offset from model origin to mounting contact point
  dischargeProfile: {
    // Voltage vs capacity remaining
    percentage: number;
    voltage: number;
  }[];
  price: number;
}

export interface Receiver {
  id: string;
  name: string;
  protocol: string; // e.g., "SBUS", "CRSF"
  weight: number; // grams
  mounting_point?: [number, number, number];
  currentDraw: number; // mA
  channels: number;
  price: number;
}

// Drone build with component IDs (for storage)
export interface DroneBuildConfig {
  id: string;
  name: string;
  description?: string;
  componentIds: {
    frameId: string | null;
    motorId: string | null;
    propellerId: string | null;
    escId: string | null;
    flightControllerId: string | null;
    batteryId: string | null;
    receiverId?: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Complete drone build with full component objects (for analysis)
export interface DroneBuild {
  id: string;
  name: string;
  description?: string;
  components: {
    frame: Frame | null;
    motors: Motor | null; // Assumes all 4 motors are the same
    propellers: Propeller | null;
    esc: ESC | null;
    flightController: FlightController | null;
    battery: Battery | null;
    receiver?: Receiver | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Analysis results
export interface PerformanceMetrics {
  totalWeight: number; // grams
  maxThrust: number; // grams (all motors combined)
  thrustToWeightRatio: number;
  powerDraw: number; // watts
  rating: {
    weight: "light" | "medium" | "heavy";
    thrustToWeight: "poor" | "adequate" | "good" | "excellent";
  };
}

export interface FlightSimulation {
  batteryCapacity: number; // mAh
  avgCurrentDraw: number; // amps
  estimatedFlightTime: number; // minutes
  estimatedRange: number; // km (assuming average speed)
  avgSpeed: number; // km/h
  hoverTime: number; // minutes at hover throttle
  maxSpeed: number; // km/h at full throttle
  efficiency: number; // mAh per km
  dischargeData: {
    time: number; // minutes
    voltage: number;
    remainingCapacity: number; // mAh
    currentDraw: number; // amps at this point
  }[];
  throttleProfile: {
    throttle: number; // 0-1
    thrust: number; // grams
    current: number; // amps
    power: number; // watts
  }[];
}

export interface BuildAnalysis {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  performance: PerformanceMetrics;
  flightSimulation: FlightSimulation;
  totalCost: number;
}

