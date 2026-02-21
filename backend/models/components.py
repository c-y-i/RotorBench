"""
Pydantic models for drone components.
These models provide validation and serialization for the API.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
from enum import Enum


class VoltageRange(BaseModel):
    min: float = Field(..., description="Minimum voltage")
    max: float = Field(..., description="Maximum voltage")


class Motor(BaseModel):
    id: str
    name: str
    kv: int = Field(..., description="RPM per volt")
    weight: float = Field(..., description="Weight in grams")
    max_current: float = Field(..., alias="maxCurrent", description="Maximum current in amps")
    voltage: VoltageRange
    size: str = Field(..., description="Motor size (e.g., 2207, 2306)")
    price: float

    class Config:
        populate_by_name = True


class ThrustDataPoint(BaseModel):
    kv: int = Field(..., description="Motor KV this thrust data applies to")
    thrust: float = Field(..., description="Thrust in grams at full throttle")


class Propeller(BaseModel):
    id: str
    name: str
    size: float = Field(..., description="Propeller size in inches")
    pitch: float = Field(..., description="Propeller pitch in inches")
    blade_count: int = Field(..., alias="bladeCount")
    weight: float = Field(..., description="Weight per propeller in grams")
    material: str = Field(..., description="Material (e.g., Carbon Fiber, Plastic)")
    price: float
    thrust_data: List[ThrustDataPoint] = Field(..., alias="thrustData", description="Thrust data for different motor KVs")

    class Config:
        populate_by_name = True


class ESC(BaseModel):
    id: str
    name: str
    manufacturer: str = Field(..., description="ESC manufacturer")
    current_rating: float = Field(..., alias="currentRating", description="Continuous current rating in amps")
    burst_current: float = Field(..., alias="burstCurrent", description="Burst current in amps")
    weight: float = Field(..., description="Weight in grams")
    voltage: VoltageRange
    protocol: List[str] = Field(..., description="Supported protocols (e.g., DShot600)")
    price: float

    class Config:
        populate_by_name = True


class FlightController(BaseModel):
    id: str
    name: str
    manufacturer: str = Field(..., description="FC manufacturer")
    processor: str
    weight: float = Field(..., description="Weight in grams")
    firmware: List[str] = Field(..., description="Supported firmware")
    imu: str = Field(..., description="IMU sensor model")
    max_voltage: float = Field(..., alias="maxVoltage")
    features: List[str] = Field(..., description="Features like OSD, Blackbox, etc.")
    price: float

    class Config:
        populate_by_name = True


class Frame(BaseModel):
    id: str
    name: str
    size: int = Field(..., description="Wheelbase in mm")
    weight: float = Field(..., description="Weight in grams")
    material: str = Field(..., description="Frame material")
    motor_count: int = Field(default=4, alias="motorCount", description="Number of motors")
    max_prop_size: float = Field(..., alias="maxPropSize", description="Maximum propeller size in inches")
    stack_height: float = Field(..., alias="stackHeight", description="Stack mounting height in mm")
    price: float

    class Config:
        populate_by_name = True


class DischargePoint(BaseModel):
    percentage: float = Field(..., ge=0, le=100, description="Battery percentage remaining")
    voltage: float = Field(..., description="Voltage at this percentage")


class Battery(BaseModel):
    id: str
    name: str
    capacity: int = Field(..., description="Capacity in mAh")
    voltage: float = Field(..., description="Nominal voltage")
    cells: int = Field(..., description="Number of cells (S count)")
    c_rating: int = Field(..., alias="cRating", description="Discharge C rating")
    weight: float = Field(..., description="Weight in grams")
    discharge_profile: List[DischargePoint] = Field(
        ..., alias="dischargeProfile", description="Battery discharge curve"
    )
    price: float

    class Config:
        populate_by_name = True


class Receiver(BaseModel):
    id: str
    name: str
    protocol: str = Field(..., description="Communication protocol")
    weight: float = Field(..., description="Weight in grams")
    current_draw: float = Field(..., alias="currentDraw", description="Current draw in mA")
    channels: int
    price: float

    class Config:
        populate_by_name = True


class ComponentDatabase(BaseModel):
    """Complete database of all available components"""
    motors: List[Motor]
    propellers: List[Propeller]
    escs: List[ESC]
    flight_controllers: List[FlightController]
    frames: List[Frame]
    batteries: List[Battery]
    receivers: List[Receiver]


class ComponentIds(BaseModel):
    frame_id: Optional[str] = Field(None, alias="frameId")
    motor_id: Optional[str] = Field(None, alias="motorId")
    propeller_id: Optional[str] = Field(None, alias="propellerId")
    esc_id: Optional[str] = Field(None, alias="escId")
    flight_controller_id: Optional[str] = Field(None, alias="flightControllerId")
    battery_id: Optional[str] = Field(None, alias="batteryId")
    receiver_id: Optional[str] = Field(None, alias="receiverId")

    class Config:
        populate_by_name = True


class DroneBuildConfig(BaseModel):
    """Drone build configuration with component IDs (for storage)"""
    id: Optional[str] = None
    user_id: Optional[str] = Field(None, alias="userId")
    name: str
    description: Optional[str] = None
    note: Optional[str] = None
    component_ids: ComponentIds = Field(..., alias="componentIds")
    total_weight: Optional[float] = Field(None, alias="totalWeight")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")

    class Config:
        populate_by_name = True


class DroneComponents(BaseModel):
    frame: Optional[Frame] = None
    motors: Optional[Motor] = None
    propellers: Optional[Propeller] = None
    esc: Optional[ESC] = None
    flight_controller: Optional[FlightController] = Field(None, alias="flightController")
    battery: Optional[Battery] = None
    receiver: Optional[Receiver] = None

    class Config:
        populate_by_name = True


class DroneBuild(BaseModel):
    """Complete drone build with full component objects (for analysis)"""
    id: str
    name: str
    description: Optional[str] = None
    components: DroneComponents
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        populate_by_name = True


class WeightRating(str, Enum):
    LIGHT = "light"
    MEDIUM = "medium"
    HEAVY = "heavy"


class ThrustRating(str, Enum):
    POOR = "poor"
    ADEQUATE = "adequate"
    GOOD = "good"
    EXCELLENT = "excellent"


class PerformanceRating(BaseModel):
    weight: WeightRating
    thrust_to_weight: ThrustRating = Field(..., alias="thrustToWeight")

    class Config:
        populate_by_name = True


class PerformanceMetrics(BaseModel):
    total_weight: float = Field(..., alias="totalWeight", description="Total weight in grams")
    max_thrust: float = Field(..., alias="maxThrust", description="Maximum thrust in grams")
    thrust_to_weight_ratio: float = Field(..., alias="thrustToWeightRatio")
    power_draw: float = Field(..., alias="powerDraw", description="Average power draw in watts")
    rating: PerformanceRating

    class Config:
        populate_by_name = True


class DischargeDataPoint(BaseModel):
    time: float = Field(..., description="Time in minutes")
    voltage: float
    remaining_capacity: float = Field(..., alias="remainingCapacity", description="Remaining capacity in mAh")
    current_draw: float = Field(..., alias="currentDraw", description="Current draw in amps")

    class Config:
        populate_by_name = True


class ThrottleProfilePoint(BaseModel):
    throttle: float = Field(..., ge=0, le=1, description="Throttle percentage 0-1")
    thrust: float = Field(..., description="Thrust in grams")
    current: float = Field(..., description="Current draw in amps")
    power: float = Field(..., description="Power in watts")


class FlightSimulation(BaseModel):
    battery_capacity: float = Field(..., alias="batteryCapacity", description="Battery capacity in mAh")
    avg_current_draw: float = Field(..., alias="avgCurrentDraw", description="Average current draw in amps")
    estimated_flight_time: float = Field(..., alias="estimatedFlightTime", description="Estimated flight time in minutes")
    estimated_range: float = Field(..., alias="estimatedRange", description="Estimated range in km")
    avg_speed: float = Field(..., alias="avgSpeed", description="Average speed in km/h")
    hover_time: float = Field(..., alias="hoverTime", description="Hover time in minutes")
    max_speed: float = Field(..., alias="maxSpeed", description="Max speed in km/h")
    efficiency: float = Field(..., description="Efficiency in mAh per km")
    discharge_data: List[DischargeDataPoint] = Field(..., alias="dischargeData")
    throttle_profile: List[ThrottleProfilePoint] = Field(..., alias="throttleProfile")

    class Config:
        populate_by_name = True


class BuildAnalysis(BaseModel):
    is_valid: bool = Field(..., alias="isValid")
    errors: List[str]
    warnings: List[str]
    performance: PerformanceMetrics
    flight_simulation: FlightSimulation = Field(..., alias="flightSimulation")
    total_cost: float = Field(..., alias="totalCost")

    class Config:
        populate_by_name = True
