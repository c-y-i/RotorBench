"""
Utility functions for build analysis.
Calculates performance metrics and flight time simulations.
"""
import math
from typing import List, Tuple
from models.components import (
    DroneBuild,
    PerformanceMetrics,
    FlightSimulation,
    BuildAnalysis,
    PerformanceRating,
    WeightRating,
    ThrustRating,
    DischargeDataPoint,
    ThrottleProfilePoint
)


def calculate_thrust_for_motor_prop_combo(motor, propeller) -> float:
    """
    Calculate thrust for a specific motor-propeller combination
    Uses interpolation if exact KV not in propeller's thrust data
    """
    if not motor or not propeller:
        return 0.0
    
    thrust_data = propeller.thrust_data
    motor_kv = motor.kv
    
    # Find exact match
    for data_point in thrust_data:
        if data_point.kv == motor_kv:
            return data_point.thrust
    
    # Interpolate between two closest KV values
    sorted_data = sorted(thrust_data, key=lambda x: x.kv)
    
    # If motor KV is below lowest data point
    if motor_kv < sorted_data[0].kv:
        # Extrapolate linearly (thrust scales roughly linearly with KV)
        ratio = motor_kv / sorted_data[0].kv
        return sorted_data[0].thrust * ratio
    
    # If motor KV is above highest data point
    if motor_kv > sorted_data[-1].kv:
        ratio = motor_kv / sorted_data[-1].kv
        return sorted_data[-1].thrust * ratio
    
    # Interpolate between two points
    for i in range(len(sorted_data) - 1):
        if sorted_data[i].kv <= motor_kv <= sorted_data[i + 1].kv:
            # Linear interpolation
            kv1, thrust1 = sorted_data[i].kv, sorted_data[i].thrust
            kv2, thrust2 = sorted_data[i + 1].kv, sorted_data[i + 1].thrust
            
            t = (motor_kv - kv1) / (kv2 - kv1)
            return thrust1 + t * (thrust2 - thrust1)
    
    return 0.0


def calculate_total_weight(build: DroneBuild) -> float:
    """Calculate total weight of the drone build in grams"""
    total = 0.0
    
    if build.components.frame:
        total += build.components.frame.weight
    
    if build.components.motors:
        motor_count = build.components.frame.motor_count if build.components.frame else 4
        total += build.components.motors.weight * motor_count
    
    if build.components.propellers:
        motor_count = build.components.frame.motor_count if build.components.frame else 4
        total += build.components.propellers.weight * motor_count
    
    if build.components.esc:
        total += build.components.esc.weight
    
    if build.components.flight_controller:
        total += build.components.flight_controller.weight
    
    if build.components.battery:
        total += build.components.battery.weight
    
    if build.components.receiver:
        total += build.components.receiver.weight
    
    # Add estimated weight for wiring, screws, camera, etc. (~50g)
    total += 50
    
    return round(total, 1)


def calculate_max_thrust(build: DroneBuild) -> float:
    """Calculate maximum thrust in grams (all motors at full throttle)"""
    if not build.components.motors or not build.components.propellers:
        return 0.0
    
    motor_count = build.components.frame.motor_count if build.components.frame else 4
    thrust_per_motor = calculate_thrust_for_motor_prop_combo(
        build.components.motors,
        build.components.propellers
    )
    
    max_thrust = thrust_per_motor * motor_count
    
    return round(max_thrust, 1)


def calculate_current_at_throttle(motor, throttle: float) -> float:
    """
    Calculate current draw for a motor at given throttle
    """
    if not motor:
        return 0.0
    
    # More realistic model:
    # - Typical cruise current is 25-35% of max_current
    # - Current scales with throttle^2 (power is proportional to RPM^3, but efficiency improves)
    # - Use a base multiplier of 0.3 to get realistic cruise currents
    
    base_current_ratio = 0.3  # At 50% throttle, motor draws ~30% of max current
    current = motor.max_current * base_current_ratio * (throttle ** 1.5)
    
    return current


def calculate_power_draw(build: DroneBuild, throttle_percentage: float = 0.5) -> float:
    """
    Calculate power draw in watts at a given throttle percentage
    """
    if not build.components.motors or not build.components.battery:
        return 0.0
    
    motor_count = build.components.frame.motor_count if build.components.frame else 4
    
    # Current per motor at given throttle
    current_per_motor = calculate_current_at_throttle(build.components.motors, throttle_percentage)
    total_motor_current = current_per_motor * motor_count
    
    # Add system current (FC, RX, etc.)
    system_current = 0.0
    if build.components.flight_controller:
        system_current += 0.5  # FC typically draws ~500mA
    if build.components.receiver:
        system_current += build.components.receiver.current_draw / 1000.0
    
    total_current = total_motor_current + system_current
    
    # Power = Voltage * Current
    voltage = build.components.battery.voltage
    power = voltage * total_current
    
    return round(power, 2)


def get_weight_rating(weight: float) -> WeightRating:
    """Get weight rating based on total weight (for 5-inch quad)"""
    if weight < 500:
        return WeightRating.LIGHT
    elif weight < 700:
        return WeightRating.MEDIUM
    else:
        return WeightRating.HEAVY


def get_thrust_rating(ratio: float) -> ThrustRating:
    """Get thrust-to-weight rating"""
    if ratio < 3.0:
        return ThrustRating.POOR
    elif ratio < 5.0:
        return ThrustRating.ADEQUATE
    elif ratio < 8.0:
        return ThrustRating.GOOD
    else:
        return ThrustRating.EXCELLENT


def calculate_performance_metrics(build: DroneBuild) -> PerformanceMetrics:
    """Calculate all performance metrics"""
    total_weight = calculate_total_weight(build)
    max_thrust = calculate_max_thrust(build)
    
    # Thrust-to-weight ratio
    twr = max_thrust / total_weight if total_weight > 0 else 0.0
    
    # Average power draw at 50% throttle
    power_draw = calculate_power_draw(build, throttle_percentage=0.5)
    
    return PerformanceMetrics(
        total_weight=total_weight,
        max_thrust=max_thrust,
        thrust_to_weight_ratio=round(twr, 2),
        power_draw=power_draw,
        rating=PerformanceRating(
            weight=get_weight_rating(total_weight),
            thrust_to_weight=get_thrust_rating(twr)
        )
    )


def calculate_throttle_profile(build: DroneBuild) -> List[ThrottleProfilePoint]:
    """
    Generate throttle profile showing thrust, current, and power at different throttle levels
    """
    if not build.components.motors or not build.components.propellers or not build.components.battery:
        return []
    
    profile = []
    motor_count = build.components.frame.motor_count if build.components.frame else 4
    thrust_per_motor = calculate_thrust_for_motor_prop_combo(
        build.components.motors,
        build.components.propellers
    )
    voltage = build.components.battery.voltage
    
    # Generate points from 0% to 100% throttle
    for throttle_pct in range(0, 101, 10):
        throttle = throttle_pct / 100.0
        
        # Thrust scales roughly linearly with throttle^2
        thrust = thrust_per_motor * motor_count * (throttle ** 2)
        
        # Current calculation
        current_per_motor = calculate_current_at_throttle(build.components.motors, throttle)
        total_current = current_per_motor * motor_count
        
        # Add system current
        system_current = 0.5
        if build.components.receiver:
            system_current += build.components.receiver.current_draw / 1000.0
        
        total_current += system_current
        
        # Power
        power = voltage * total_current
        
        profile.append(ThrottleProfilePoint(
            throttle=round(throttle, 2),
            thrust=round(thrust, 1),
            current=round(total_current, 2),
            power=round(power, 2)
        ))
    
    return profile


def calculate_flight_time(build: DroneBuild, avg_throttle: float = 0.5) -> Tuple[float, float]:
    """
    Calculate estimated flight time and current draw
    Returns: (flight_time_minutes, avg_current_amps)
    """
    if not build.components.battery or not build.components.motors:
        return 0.0, 0.0
    
    battery_capacity = build.components.battery.capacity
    motor_count = build.components.frame.motor_count if build.components.frame else 4
    
    # Current per motor at average throttle
    current_per_motor = calculate_current_at_throttle(build.components.motors, avg_throttle)
    total_motor_current = current_per_motor * motor_count
    
    # Add system current
    system_current = 0.5
    if build.components.receiver:
        system_current += build.components.receiver.current_draw / 1000.0
    
    avg_current = total_motor_current + system_current
    
    # Flight time = (capacity * 0.8) / (current * 1000) * 60
    # 0.8 factor accounts for not fully discharging the battery (safety margin)
    usable_capacity = battery_capacity * 0.8
    flight_time_hours = usable_capacity / (avg_current * 1000)
    flight_time_minutes = flight_time_hours * 60
    
    return round(flight_time_minutes, 1), round(avg_current, 2)


def calculate_range(flight_time_minutes: float, avg_speed_kmh: float = 45) -> float:
    """Calculate estimated range in km"""
    flight_time_hours = flight_time_minutes / 60.0
    range_km = flight_time_hours * avg_speed_kmh
    return round(range_km, 2)


def calculate_hover_time(build: DroneBuild) -> float:
    """Calculate hover time at minimum throttle to maintain altitude"""
    if not build.components.battery or not build.components.motors:
        return 0.0
    
    total_weight = calculate_total_weight(build)
    max_thrust = calculate_max_thrust(build)
    
    if max_thrust == 0:
        return 0.0
    
    # Hover throttle is when thrust equals weight
    # Since thrust scales with throttle^2, hover_throttle = sqrt(weight/max_thrust)
    hover_throttle = math.sqrt(total_weight / max_thrust)
    hover_throttle = min(hover_throttle, 1.0)  # Cap at 100%
    
    hover_time, _ = calculate_flight_time(build, avg_throttle=hover_throttle)
    return round(hover_time, 1)


def calculate_max_speed(total_weight: float, max_thrust: float) -> float:
    """
    Estimate maximum speed based on thrust-to-weight ratio
    This is a rough approximation
    """
    if total_weight == 0:
        return 0.0
    
    twr = max_thrust / total_weight
    
    # Empirical formula: max speed increases with TWR
    # Base speed ~60 km/h, scales with sqrt(TWR)
    max_speed = 60 * math.sqrt(twr / 5.0)
    
    return round(max_speed, 1)


def generate_discharge_curve(
    build: DroneBuild,
    flight_time_minutes: float,
    avg_current: float
) -> List[DischargeDataPoint]:
    """
    Generate battery discharge curve data
    Creates a detailed discharge profile with multiple data points for visualization
    """
    if not build.components.battery:
        return []
    
    battery = build.components.battery
    discharge_profile = battery.discharge_profile
    
    # Generate more data points for better visualization
    # Use adaptive time step: smaller step for shorter flights, larger for longer
    if flight_time_minutes < 3:
        time_step = 0.2  # 12 second intervals for very short flights
    elif flight_time_minutes < 10:
        time_step = 0.3  # 18 second intervals for short flights  
    else:
        time_step = 0.5  # 30 second intervals for longer flights
    
    # Always generate at least 20 points for smooth curves
    min_points = 20
    if (flight_time_minutes / time_step) < min_points:
        time_step = flight_time_minutes / min_points
    
    data_points = []
    
    # Calculate usable capacity (80% for safety)
    usable_capacity_mah = battery.capacity * 0.8
    usable_flight_time = (usable_capacity_mah / (avg_current * 1000)) * 60  # minutes
    
    # Generate points up to 20% remaining (80% discharged)
    num_points = int(usable_flight_time / time_step) + 1
    num_points = max(num_points, min_points)  # Ensure minimum points
    
    for i in range(num_points):
        time = i * time_step
        
        # Don't exceed the usable flight time
        if time > usable_flight_time:
            break
        
        # Calculate remaining capacity
        discharged_mah = avg_current * 1000 * (time / 60.0)
        remaining_capacity = battery.capacity - discharged_mah
        remaining_percentage = (remaining_capacity / battery.capacity) * 100
        
        # Stop if we've reached the safety limit (20%)
        if remaining_percentage < 20:
            break
        
        # Interpolate voltage from discharge profile
        voltage = interpolate_voltage(discharge_profile, remaining_percentage)
        
        # Current draw varies slightly as voltage drops (constant power assumption)
        # I = P/V, so as V drops, I increases slightly
        nominal_voltage = battery.voltage
        adjusted_current = avg_current * (nominal_voltage / voltage) if voltage > 0 else avg_current
        
        data_points.append(DischargeDataPoint(
            time=round(time / 60, 3),  # Convert to hours for X-axis
            voltage=round(voltage, 2),
            remaining_capacity=round(remaining_capacity, 1),
            current_draw=round(adjusted_current, 2)
        ))
    
    # Ensure we have at least some data points even for edge cases
    if len(data_points) == 0 and battery.capacity > 0:
        # Add just the starting point
        data_points.append(DischargeDataPoint(
            time=0.0,
            voltage=round(interpolate_voltage(discharge_profile, 100), 2),
            remaining_capacity=round(battery.capacity, 1),
            current_draw=round(avg_current, 2)
        ))
    
    return data_points


def interpolate_voltage(discharge_profile, percentage: float) -> float:
    """Interpolate voltage from discharge profile"""
    for i in range(len(discharge_profile) - 1):
        p1 = discharge_profile[i]
        p2 = discharge_profile[i + 1]
        
        if p2.percentage <= percentage <= p1.percentage:
            # Linear interpolation
            t = (percentage - p2.percentage) / (p1.percentage - p2.percentage)
            voltage = p2.voltage + t * (p1.voltage - p2.voltage)
            return voltage
    
    # If percentage is outside range, return closest value
    if percentage >= discharge_profile[0].percentage:
        return discharge_profile[0].voltage
    return discharge_profile[-1].voltage


def calculate_flight_simulation(build: DroneBuild) -> FlightSimulation:
    """Calculate enhanced flight simulation"""
    if not build.components.battery:
        return FlightSimulation(
            battery_capacity=0,
            avg_current_draw=0,
            estimated_flight_time=0,
            estimated_range=0,
            avg_speed=0,
            hover_time=0,
            max_speed=0,
            efficiency=0,
            discharge_data=[],
            throttle_profile=[]
        )
    
    # Calculate flight metrics
    flight_time, avg_current = calculate_flight_time(build, avg_throttle=0.5)
    hover_time = calculate_hover_time(build)
    
    total_weight = calculate_total_weight(build)
    max_thrust = calculate_max_thrust(build)
    
    avg_speed = 45.0  # km/h for sport flying
    max_speed = calculate_max_speed(total_weight, max_thrust)
    range_km = calculate_range(flight_time, avg_speed)
    
    # Efficiency: mAh per km
    efficiency = (build.components.battery.capacity * 0.8) / range_km if range_km > 0 else 0
    
    # Generate discharge curve and throttle profile
    discharge_data = generate_discharge_curve(build, flight_time, avg_current)
    throttle_profile = calculate_throttle_profile(build)
    
    return FlightSimulation(
        battery_capacity=build.components.battery.capacity,
        avg_current_draw=avg_current,
        estimated_flight_time=flight_time,
        estimated_range=range_km,
        avg_speed=avg_speed,
        hover_time=hover_time,
        max_speed=max_speed,
        efficiency=round(efficiency, 1),
        discharge_data=discharge_data,
        throttle_profile=throttle_profile
    )


def validate_build(build: DroneBuild) -> Tuple[bool, List[str], List[str]]:
    """
    Validate drone build for compatibility and issues
    Returns: (is_valid, errors, warnings)
    """
    errors = []
    warnings = []
    
    # Check required components (minimum for analysis)
    if not build.components.frame:
        errors.append("Frame is required")
    if not build.components.motors:
        errors.append("Motors are required")
    if not build.components.propellers:
        errors.append("Propellers are required")
    if not build.components.battery:
        errors.append("Battery is required")
    
    # ESC and Flight Controller are optional for basic analysis
    # Add warnings if missing
    if not build.components.esc:
        warnings.append("ESC not selected - some calculations may be limited")
    if not build.components.flight_controller:
        warnings.append("Flight controller not selected - weight calculation excludes FC")
    
    # Check compatibility
    if build.components.motors and build.components.battery:
        # Check voltage compatibility
        motor_min = build.components.motors.voltage.min
        motor_max = build.components.motors.voltage.max
        battery_voltage = build.components.battery.voltage
        
        if not (motor_min <= battery_voltage <= motor_max):
            errors.append(
                f"Battery voltage ({battery_voltage}V) is outside motor voltage range "
                f"({motor_min}V - {motor_max}V)"
            )
    
    if build.components.esc and build.components.battery:
        # Check ESC voltage compatibility
        esc_max = build.components.esc.voltage.max
        battery_voltage = build.components.battery.voltage
        
        if battery_voltage > esc_max:
            errors.append(
                f"Battery voltage ({battery_voltage}V) exceeds ESC maximum ({esc_max}V)"
            )
    
    if build.components.motors and build.components.esc:
        # Check ESC current rating (per motor for 4-in-1 ESC)
        # ESC current rating is per motor channel, not total
        motor_max_current = build.components.motors.max_current
        esc_rating_per_channel = build.components.esc.current_rating
        
        if motor_max_current > esc_rating_per_channel:
            warnings.append(
                f"Motor current ({motor_max_current}A) may exceed ESC rating ({esc_rating_per_channel}A per channel)"
            )
    
    if build.components.propellers and build.components.frame:
        # Check propeller size
        prop_size = build.components.propellers.size
        max_prop = build.components.frame.max_prop_size
        
        if prop_size > max_prop:
            errors.append(
                f"Propeller size ({prop_size}\") exceeds frame maximum ({max_prop}\")"
            )
    
    is_valid = len(errors) == 0
    return is_valid, errors, warnings


def calculate_total_cost(build: DroneBuild) -> float:
    """Calculate total cost of the build"""
    total = 0.0
    
    if build.components.frame:
        total += build.components.frame.price
    
    if build.components.motors:
        motor_count = build.components.frame.motor_count if build.components.frame else 4
        total += build.components.motors.price * motor_count
    
    if build.components.propellers:
        # Usually buy in sets of 4 (or 8 for spares)
        total += build.components.propellers.price * 4
    
    if build.components.esc:
        total += build.components.esc.price
    
    if build.components.flight_controller:
        total += build.components.flight_controller.price
    
    if build.components.battery:
        total += build.components.battery.price
    
    if build.components.receiver:
        total += build.components.receiver.price
    
    return round(total, 2)


def analyze_build(build: DroneBuild) -> BuildAnalysis:
    """
    Perform complete analysis of a drone build
    Returns all performance metrics, flight simulation, and validation results
    """
    is_valid, errors, warnings = validate_build(build)
    
    # Only calculate if build has minimum required components
    if build.components.motors and build.components.battery and build.components.propellers:
        performance = calculate_performance_metrics(build)
        flight_sim = calculate_flight_simulation(build)
    else:
        # Return empty metrics if incomplete
        performance = PerformanceMetrics(
            total_weight=0,
            max_thrust=0,
            thrust_to_weight_ratio=0,
            power_draw=0,
            rating=PerformanceRating(
                weight=WeightRating.MEDIUM,
                thrust_to_weight=ThrustRating.POOR
            )
        )
        flight_sim = FlightSimulation(
            battery_capacity=0,
            avg_current_draw=0,
            estimated_flight_time=0,
            estimated_range=0,
            avg_speed=0,
            hover_time=0,
            max_speed=0,
            efficiency=0,
            discharge_data=[],
            throttle_profile=[]
        )
    
    total_cost = calculate_total_cost(build)
    
    return BuildAnalysis(
        is_valid=is_valid,
        errors=errors,
        warnings=warnings,
        performance=performance,
        flight_simulation=flight_sim,
        total_cost=total_cost
    )
