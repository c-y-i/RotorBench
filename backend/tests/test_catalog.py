import unittest

from pydantic import ValidationError

from models.components import DroneBuildConfig
from utils.build_analysis import analyze_build
from utils.component_data import (
    get_all_components_db,
    hydrate_build,
    load_all_components,
)


class CatalogContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = load_all_components()
        cls.database = get_all_components_db()

    def test_catalog_counts_are_stable(self):
        counts = {
            category: len(items)
            for category, items in self.catalog.items()
        }
        self.assertEqual(
            counts,
            {
                "frames": 9,
                "motors": 15,
                "propellers": 9,
                "batteries": 9,
                "escs": 7,
                "flight_controllers": 8,
                "receivers": 8,
            },
        )
        self.assertEqual(sum(counts.values()), 65)

    def test_all_component_ids_are_unique(self):
        ids = [
            component["id"]
            for items in self.catalog.values()
            for component in items
        ]
        self.assertEqual(len(ids), len(set(ids)))

    def test_component_database_hydrates_every_product(self):
        records = [
            *self.database.frames,
            *self.database.motors,
            *self.database.propellers,
            *self.database.batteries,
            *self.database.escs,
            *self.database.flight_controllers,
            *self.database.receivers,
        ]
        self.assertEqual(len(records), 65)
        self.assertTrue(all(record.id for record in records))

    def test_rp2_keeps_published_and_estimated_fields_separate(self):
        receiver = next(
            item for item in self.database.receivers
            if item.id == "rx-radiomaster-rp2-v2"
        )
        self.assertEqual(receiver.protocol, "CRSF")
        self.assertEqual(receiver.weight, 0.55)
        self.assertEqual(receiver.dimensions_mm, [13, 11, 7])
        self.assertEqual(receiver.price, 18.99)
        self.assertIn(
            "radiomasterrc.com",
            receiver.source_url,
        )
        self.assertIn("currentDraw", receiver.estimated_fields)
        self.assertIn("channels", receiver.estimated_fields)
        self.assertNotIn("dimensionsMm", receiver.estimated_fields)
        self.assertNotIn("weight", receiver.estimated_fields)

    def test_rp3_keeps_published_and_estimated_fields_separate(self):
        receiver = next(
            item for item in self.database.receivers
            if item.id == "rx-radiomaster-rp3-v2"
        )
        self.assertEqual(receiver.protocol, "CRSF")
        self.assertEqual(receiver.weight, 4.6)
        self.assertEqual(receiver.dimensions_mm, [22, 13, 4])
        self.assertEqual(receiver.price, 19.99)
        self.assertIn("radiomasterrc.com", receiver.source_url)
        self.assertIn("currentDraw", receiver.estimated_fields)
        self.assertIn("channels", receiver.estimated_fields)
        self.assertNotIn("dimensionsMm", receiver.estimated_fields)
        self.assertNotIn("weight", receiver.estimated_fields)

    def test_f1404_variants_share_mounting_and_keep_distinct_voltage_limits(self):
        motors = {
            motor.id: motor
            for motor in self.database.motors
            if motor.id in {
                "motor-tmotor-f1404-4600kv",
                "motor-tmotor-f1404-2900kv",
            }
        }
        self.assertEqual(len(motors), 2)
        high_kv = motors["motor-tmotor-f1404-4600kv"]
        low_kv = motors["motor-tmotor-f1404-2900kv"]
        self.assertEqual(high_kv.voltage.max, 16.8)
        self.assertEqual(low_kv.voltage.max, 25.2)
        self.assertEqual(high_kv.prop_shaft_mm, 1.5)
        self.assertEqual(low_kv.prop_shaft_mm, 1.5)
        self.assertEqual(high_kv.mounting_pattern_mm, [9, 9])
        self.assertEqual(low_kv.mounting_pattern_mm, [9, 9])
        for motor in motors.values():
            self.assertIn("mounting_point", motor.estimated_fields)
            self.assertNotIn("mountingPatternMm", motor.estimated_fields)
            self.assertNotIn("propShaftMm", motor.estimated_fields)

    def test_measured_geometry_survives_build_round_trip_and_hydration(self):
        config = DroneBuildConfig(
            id="build-measured",
            name="Measured build",
            componentIds={
                "frameId": "frame-aos-55-v2",
                "motorId": "motor-tmotor-f60-pro-v-1750kv",
                "propellerId": "prop-gemfan-hurricane-51466-v2",
            },
            geometryOverrides={
                "schema": "rotorbench.measured-geometry.v1",
                "categories": {
                    "frames": {
                        "frame-aos-55-v2": {
                            "batteryDeckDimensionsMm": [70, 80],
                        }
                    },
                    "motors": {
                        "motor-tmotor-f60-pro-v-1750kv": {
                            "propShaftMm": 5,
                            "dimensionsMm": [26.8, 31.7, 26.8],
                        }
                    }
                },
            },
        )

        stored = config.model_dump(by_alias=True, exclude_none=True)
        self.assertEqual(
            stored["geometryOverrides"]["schema"],
            "rotorbench.measured-geometry.v1",
        )
        hydrated = hydrate_build(config)
        self.assertEqual(
            hydrated.components.frame.battery_deck_dimensions_mm,
            [70, 80],
        )
        self.assertEqual(hydrated.components.motors.prop_shaft_mm, 5)
        self.assertEqual(
            hydrated.components.motors.dimensions_mm,
            [26.8, 31.7, 26.8],
        )

    def test_measured_geometry_rejects_non_positive_values(self):
        with self.assertRaises(ValidationError):
            DroneBuildConfig(
                name="Invalid measurements",
                componentIds={"motorId": "motor-tmotor-f60-pro-v-1750kv"},
                geometryOverrides={
                    "schema": "rotorbench.measured-geometry.v1",
                    "categories": {
                        "motors": {
                            "motor-tmotor-f60-pro-v-1750kv": {
                                "propShaftMm": -5,
                            }
                        }
                    },
                },
            )

    def test_power_connection_metadata_matches_official_pack_contents(self):
        escs = {esc.id: esc for esc in self.database.escs}
        solder_pad = escs["esc-holybro-tekko32-f4-65a"]
        supplied_cable = escs["esc-iflight-blitz-e55"]

        self.assertEqual(solder_pad.power_connection, "solder-pads")
        self.assertIsNone(solder_pad.included_power_connector)
        self.assertIn("holybro.com", solder_pad.connector_source_url)

        self.assertEqual(supplied_cable.power_connection, "supplied-cable")
        self.assertIsNone(supplied_cable.included_power_connector)
        self.assertIn("shop.iflight.com", supplied_cable.connector_source_url)

    def test_seven_inch_platform_components_keep_supported_and_estimated_fields_separate(self):
        frame = next(
            item for item in self.database.frames
            if item.id == "frame-aos-7-evo-v12"
        )
        motor = next(
            item for item in self.database.motors
            if item.id == "motor-iflight-xing-2806-5-1300kv"
        )

        self.assertEqual(frame.size, 293)
        self.assertEqual(frame.weight, 290)
        self.assertEqual(frame.max_prop_size, 7.0)
        self.assertEqual(frame.dimensions_mm, [284, 34.5, 228])
        self.assertEqual(frame.motor_mount_patterns_mm, [[19, 19]])
        self.assertIn("stackHeight", frame.estimated_fields)
        self.assertIn("motor positions", frame.estimated_fields)

        self.assertEqual(motor.kv, 1300)
        self.assertEqual(motor.weight, 53.3)
        self.assertEqual(motor.max_current, 48.33)
        self.assertEqual(motor.dimensions_mm, [35.06, 36.8, 35.06])
        self.assertEqual(motor.mounting_pattern_mm, [19, 19])
        self.assertEqual(motor.prop_shaft_mm, 5)
        self.assertIn("voltage", motor.estimated_fields)
        self.assertIn("mounting_point", motor.estimated_fields)

    def test_seven_inch_propeller_preserves_mechanics_without_fabricating_thrust(self):
        propeller = next(
            item for item in self.database.propellers
            if item.id == "prop-gemfan-flash-7040-3"
        )
        self.assertEqual(propeller.size, 7.0)
        self.assertEqual(propeller.pitch, 4.0)
        self.assertEqual(propeller.weight, 7.9)
        self.assertEqual(propeller.dimensions_mm, [178.43, 7.5, 178.43])
        self.assertEqual(propeller.shaft_mm, 5)
        self.assertEqual(propeller.performance_data_status, "not_published")
        self.assertEqual(propeller.thrust_data, [])

        config = DroneBuildConfig(
            id="build-seven-inch",
            name="Seven inch",
            componentIds={
                "frameId": "frame-aos-7-evo-v12",
                "motorId": "motor-iflight-xing-2806-5-1300kv",
                "propellerId": "prop-gemfan-flash-7040-3",
                "batteryId": "battery-tattu-rline-6s-1300-120c",
            },
        )
        analysis = analyze_build(hydrate_build(config))
        self.assertFalse(analysis.performance.data_available)
        self.assertEqual(analysis.performance.max_thrust, 0)
        self.assertFalse(analysis.flight_simulation.data_available)
        self.assertIn(
            "performance analysis is unavailable",
            " ".join(analysis.warnings),
        )

    def test_cine25_frame_and_propeller_use_published_mechanics(self):
        frame = next(
            item for item in self.database.frames
            if item.id == "frame-aos-cine25-v5"
        )
        propeller = next(
            item for item in self.database.propellers
            if item.id == "prop-gemfan-hurricane-2520-3"
        )
        self.assertEqual(frame.size, 120)
        self.assertEqual(frame.weight, 58)
        self.assertEqual(frame.max_prop_size, 2.5)
        self.assertEqual(frame.stack_mount_patterns_mm, [[20, 20], [25.5, 25.5]])
        self.assertEqual(frame.motor_mount_patterns_mm, [[9, 9]])
        self.assertEqual(frame.dimensions_mm, [171, 34, 147])
        self.assertIn("motor positions", frame.estimated_fields)
        self.assertEqual(propeller.size, 2.5)
        self.assertEqual(propeller.pitch, 2)
        self.assertEqual(propeller.weight, 1.0)
        self.assertEqual(propeller.shaft_mm, 1.5)
        self.assertEqual(propeller.hub_thickness_mm, 5.5)
        self.assertEqual(propeller.dimensions_mm, [64, 5.5, 64])
        self.assertEqual(propeller.performance_data_status, "not_published")
        self.assertEqual(propeller.thrust_data, [])


if __name__ == "__main__":
    unittest.main()
