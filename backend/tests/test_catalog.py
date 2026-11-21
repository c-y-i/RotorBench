import unittest

from pydantic import ValidationError

from models.components import DroneBuildConfig
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
                "frames": 7,
                "motors": 14,
                "propellers": 7,
                "batteries": 9,
                "escs": 7,
                "flight_controllers": 8,
                "receivers": 8,
            },
        )
        self.assertEqual(sum(counts.values()), 60)

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
        self.assertEqual(len(records), 60)
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


if __name__ == "__main__":
    unittest.main()
