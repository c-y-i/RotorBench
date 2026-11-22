"""
Pydantic models for drone components.
These models provide validation and serialization for the API.
"""
import math

from pydantic import BaseModel, Field, field_validator
from typing import List, Literal, Optional, Dict
from datetime import datetime
from enum import Enum


class VoltageRange(BaseModel):
    min: float = Field(..., description="Minimum voltage")
    max: float = Field(..., description="Maximum voltage")


class ComponentCatalogMetadata(BaseModel):
    mounting_point: Optional[List[float]] = Field(
        None, description="Offset from the model origin to its mounting contact point"
    )
    mounting_pattern_mm: Optional[List[float]] = Field(
        None, alias="mountingPatternMm", description="Mounting-hole spacing in millimeters"
    )
    stack_mount_pattern_mm: Optional[List[float]] = Field(
        None, alias="stackMountPatternMm"
    )
    stack_mount_patterns_mm: Optional[List[List[float]]] = Field(
        None, alias="stackMountPatternsMm"
    )
    motor_mount_patterns_mm: Optional[List[List[float]]] = Field(
        None, alias="motorMountPatternsMm"
    )
    dimensions_mm: Optional[List[float]] = Field(
        None, alias="dimensionsMm", description="Physical dimensions in millimeters"
    )
    planform_mm: Optional[List[float]] = Field(
        None,
        alias="planformMm",
        description="Published board or case footprint in millimeters",
    )
    prop_shaft_mm: Optional[float] = Field(None, alias="propShaftMm")
    bell_diameter_mm: Optional[float] = Field(None, alias="bellDiameterMm")
    hub_diameter_mm: Optional[float] = Field(None, alias="hubDiameterMm")
    hub_thickness_mm: Optional[float] = Field(None, alias="hubThicknessMm")
    shaft_mm: Optional[float] = Field(None, alias="shaftMm")
    discharge_connector: Optional[str] = Field(None, alias="dischargeConnector")
    included_power_connector: Optional[str] = Field(None, alias="includedPowerConnector")
    power_connection: Optional[
        Literal["connector", "solder-pads", "supplied-cable"]
    ] = Field(None, alias="powerConnection")
    model: Optional[str] = Field(None, description="Canonical 3D model filename")
    model_cw: Optional[str] = Field(None, alias="modelCW")
    model_ccw: Optional[str] = Field(None, alias="modelCCW")
    model_status: Optional[str] = Field(None, alias="modelStatus")
    source_url: Optional[str] = Field(None, alias="sourceUrl")
    price_source_url: Optional[str] = Field(None, alias="priceSourceUrl")
    connector_source_url: Optional[str] = Field(None, alias="connectorSourceUrl")
    data_status: Optional[str] = Field(None, alias="dataStatus")
    performance_data_status: Optional[str] = Field(None, alias="performanceDataStatus")
    estimated_fields: Optional[List[str]] = Field(None, alias="estimatedFields")

    @field_validator("planform_mm")
    @classmethod
    def validate_planform(cls, value):
        return _positive_vector(value, 2)

    class Config:
        populate_by_name = True


class Motor(ComponentCatalogMetadata):
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


class Propeller(ComponentCatalogMetadata):
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


class ESC(ComponentCatalogMetadata):
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


class FlightController(ComponentCatalogMetadata):
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


class FrameServoHardware(ComponentCatalogMetadata):
    name: str
    quantity: int = Field(..., ge=1)
    unit_weight_g: float = Field(..., alias="unitWeightG", gt=0)
    weight: float = Field(..., gt=0)
    unit_price: float = Field(..., alias="unitPrice", ge=0)
    price: float = Field(..., ge=0)
    voltage: VoltageRange
    cable_lengths_mm: List[float] = Field(..., alias="cableLengthsMm")
    cable_allocation: str = Field(..., alias="cableAllocation")
    gear: str
    digital: bool
    positions_mm: List[List[float]] = Field(..., alias="positionsMm")

    class Config:
        populate_by_name = True

    @field_validator("cable_lengths_mm")
    @classmethod
    def validate_cable_lengths(cls, value):
        if not value or any(length <= 0 for length in value):
            raise ValueError("cableLengthsMm must contain positive lengths")
        return value

    @field_validator("positions_mm")
    @classmethod
    def validate_positions(cls, value):
        if not value:
            raise ValueError("positionsMm must not be empty")
        for position in value:
            if len(position) != 3 or any(not math.isfinite(entry) for entry in position):
                raise ValueError("each servo position must have three finite coordinates")
        return value


class Frame(ComponentCatalogMetadata):
    id: str
    name: str
    size: int = Field(..., description="Wheelbase in mm")
    weight: float = Field(..., description="Weight in grams")
    material: str = Field(..., description="Frame material")
    motor_count: int = Field(default=4, alias="motorCount", description="Number of motors")
    airframe_shape: Optional[Literal["quad", "wing"]] = Field(
        None,
        alias="airframeShape",
    )
    motor_positions_mm: Optional[List[List[float]]] = Field(
        None,
        alias="motorPositionsMm",
        description="Motor mount centers in the viewer coordinate system",
    )
    servo_count: Optional[int] = Field(None, alias="servoCount", ge=0)
    servo_hardware: Optional[FrameServoHardware] = Field(
        None,
        alias="servoHardware",
    )
    max_prop_size: float = Field(..., alias="maxPropSize", description="Maximum propeller size in inches")
    stack_height: float = Field(..., alias="stackHeight", description="Stack mounting height in mm")
    price: float
    upper_left_motor_position: Optional[List[float]] = None
    upper_right_motor_position: Optional[List[float]] = None
    lower_right_motor_position: Optional[List[float]] = None
    lower_left_motor_position: Optional[List[float]] = None
    battery_deck_dimensions_mm: Optional[List[float]] = Field(
        None, alias="batteryDeckDimensionsMm"
    )

    class Config:
        populate_by_name = True

    @field_validator("battery_deck_dimensions_mm")
    @classmethod
    def validate_battery_deck_dimensions(cls, value):
        return _positive_vector(value, 2)

    @field_validator("motor_positions_mm")
    @classmethod
    def validate_motor_positions(cls, value):
        if value is None:
            return None
        if not value:
            raise ValueError("motorPositionsMm must not be empty")
        for position in value:
            if not isinstance(position, list) or len(position) != 3:
                raise ValueError("each motor position must have three coordinates")
            if any(
                not isinstance(entry, (int, float)) or not math.isfinite(entry)
                for entry in position
            ):
                raise ValueError("motor position coordinates must be finite numbers")
        return value


class DischargePoint(BaseModel):
    percentage: float = Field(..., ge=0, le=100, description="Battery percentage remaining")
    voltage: float = Field(..., description="Voltage at this percentage")


class Battery(ComponentCatalogMetadata):
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


class Receiver(ComponentCatalogMetadata):
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


def _positive_vector(value: Optional[List[float]], length: int):
    if value is None:
        return None
    if len(value) != length or any(entry <= 0 for entry in value):
        raise ValueError(f"expected {length} positive millimetre values")
    return value


class GeometryValuesBase(BaseModel):
    dimensions_mm: Optional[List[float]] = Field(None, alias="dimensionsMm")

    class Config:
        populate_by_name = True
        extra = "forbid"

    @field_validator("dimensions_mm")
    @classmethod
    def validate_dimensions(cls, value):
        return _positive_vector(value, 3)


class FrameGeometryValues(GeometryValuesBase):
    stack_height: Optional[float] = Field(None, alias="stackHeight", gt=0)
    battery_deck_dimensions_mm: Optional[List[float]] = Field(
        None, alias="batteryDeckDimensionsMm"
    )

    @field_validator("battery_deck_dimensions_mm")
    @classmethod
    def validate_battery_deck_dimensions(cls, value):
        return _positive_vector(value, 2)


class MotorGeometryValues(GeometryValuesBase):
    mounting_pattern_mm: Optional[List[float]] = Field(
        None, alias="mountingPatternMm"
    )
    prop_shaft_mm: Optional[float] = Field(None, alias="propShaftMm", gt=0)
    bell_diameter_mm: Optional[float] = Field(None, alias="bellDiameterMm", gt=0)

    @field_validator("mounting_pattern_mm")
    @classmethod
    def validate_mounting_pattern(cls, value):
        return _positive_vector(value, 2)


class PropellerGeometryValues(GeometryValuesBase):
    shaft_mm: Optional[float] = Field(None, alias="shaftMm", gt=0)
    hub_diameter_mm: Optional[float] = Field(None, alias="hubDiameterMm", gt=0)
    hub_thickness_mm: Optional[float] = Field(None, alias="hubThicknessMm", gt=0)


class MeasuredGeometryCategories(BaseModel):
    frames: Dict[str, FrameGeometryValues] = Field(default_factory=dict)
    motors: Dict[str, MotorGeometryValues] = Field(default_factory=dict)
    propellers: Dict[str, PropellerGeometryValues] = Field(default_factory=dict)
    batteries: Dict[str, GeometryValuesBase] = Field(default_factory=dict)
    escs: Dict[str, GeometryValuesBase] = Field(default_factory=dict)
    flight_controllers: Dict[str, GeometryValuesBase] = Field(default_factory=dict)
    receivers: Dict[str, GeometryValuesBase] = Field(default_factory=dict)

    class Config:
        extra = "forbid"


class MeasuredGeometryOverrides(BaseModel):
    schema_value: Literal["rotorbench.measured-geometry.v1"] = Field(
        ..., alias="schema"
    )
    categories: MeasuredGeometryCategories = Field(
        default_factory=MeasuredGeometryCategories
    )

    class Config:
        populate_by_name = True
        extra = "forbid"


class DroneBuildConfig(BaseModel):
    """Drone build configuration with component IDs (for storage)"""
    id: Optional[str] = None
    user_id: Optional[str] = Field(None, alias="userId")
    name: str
    description: Optional[str] = None
    note: Optional[str] = None
    component_ids: ComponentIds = Field(..., alias="componentIds")
    geometry_overrides: Optional[MeasuredGeometryOverrides] = Field(
        None, alias="geometryOverrides"
    )
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
    data_available: bool = Field(True, alias="dataAvailable")
    data_note: Optional[str] = Field(None, alias="dataNote")

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
    data_available: bool = Field(True, alias="dataAvailable")
    data_note: Optional[str] = Field(None, alias="dataNote")

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
