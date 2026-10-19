import unittest

import pandas as pd

from main import assess_telemetry_risk


class RiskAssessmentTests(unittest.TestCase):
    def test_failed_authentication_is_explained(self):
        data = pd.DataFrame({
            "Source IP": ["10.0.0.4"] * 10,
            "Event Type": ["login_failed"] * 4 + ["login_success"] * 6,
        })

        result = assess_telemetry_risk(data)

        self.assertEqual(result["method"], "transparent_fixed_rules")
        self.assertFalse(result["is_prediction"])
        self.assertEqual(result["level"], "guarded")
        self.assertEqual(result["indicators"][0]["key"], "authentication_failures")
        self.assertEqual(result["indicators"][0]["affected_records"], 4)
        self.assertIn("10.0.0.4", result["indicators"][0]["affected_hosts"])
        self.assertIn("40.0%", result["indicators"][0]["evidence"])

    def test_management_ports_are_contextualized(self):
        data = pd.DataFrame({
            "source_ip": ["192.0.2.1", "192.0.2.2", "192.0.2.3"],
            "destination_port": [22, 443, 3389],
        })

        result = assess_telemetry_risk(data)

        port_indicator = next(
            item for item in result["indicators"]
            if item["key"] == "management_ports"
        )
        self.assertEqual(port_indicator["affected_records"], 2)
        self.assertIn("3389", port_indicator["evidence"])
        self.assertIn("22", port_indicator["evidence"])
        self.assertIn("verify whether", port_indicator["evidence"])

    def test_unknown_schema_reports_insufficient_data(self):
        result = assess_telemetry_risk(pd.DataFrame({"temperature": [21, 22, 23]}))

        self.assertIsNone(result["score"])
        self.assertEqual(result["level"], "insufficient_data")
        self.assertEqual(result["signal_coverage_percent"], 0)
        self.assertEqual(result["indicators"], [])

    def test_destination_fanout_uses_documented_threshold(self):
        data = pd.DataFrame({
            "source_ip": ["198.51.100.7"] * 10,
            "destination_ip": [f"203.0.113.{index}" for index in range(10)],
        })

        result = assess_telemetry_risk(data)

        fanout = next(
            item for item in result["indicators"]
            if item["key"] == "high_destination_fanout"
        )
        self.assertIn("10 or more distinct destinations", fanout["evidence"])
        self.assertEqual(fanout["affected_hosts"], ["198.51.100.7"])


if __name__ == "__main__":
    unittest.main()
