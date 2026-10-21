import unittest
from sync_emergencies import extract_emergency, merge_entry

class EmergencyTests(unittest.TestCase):
    def test_section_excludes_foreign_consular_phone(self):
        numbers, alternatives, excerpt = extract_emergency('<h2>Emergency services in Example</h2><p>Police: 17 or 1548</p><p>Ambulance: 1021</p><p>Fire: 14</p><h2>UK assistance</h2><p>Telephone: 020 7008 5000</p>')
        self.assertEqual(numbers, {'police':'17','ambulance':'1021','fire':'14'})
        self.assertEqual(alternatives['police'], ['1548'])
        self.assertNotIn('5000', excerpt)

    def test_common_with_specific_numbers(self):
        numbers, _, _ = extract_emergency('<h2>Emergency services</h2><p>Telephone 112 (ambulance, fire, police)</p><p>Ambulance: 15</p>')
        self.assertEqual(numbers, {'ambulance':'15','police':'112','fire':'112'})

    def test_qualified_and_missing_sections_not_guessed(self):
        numbers, _, _ = extract_emergency('<h2>Emergency services</h2><p>Police: 911 (capital only)</p>')
        self.assertEqual(numbers, {})
        with self.assertRaises(ValueError):
            extract_emergency('<p>Call 999</p>')

    def test_label_variants(self):
        numbers, _, _ = extract_emergency('<h2>Emergency services</h2><p>Ambulance or rescue: 144</p><p>Police and emergency: 911</p>')
        self.assertEqual(numbers, {'ambulance':'144','police':'911'})

    def test_conflicts_preserve_curated_values(self):
        old = {'numbers':{'police':'999'},'sourceUrl':'original','lastVerified':'2026-10-19'}
        result, conflicts = merge_entry(old, {'police':'911'}, 'new', 'now', {}, '')
        self.assertEqual(result, old)
        self.assertIn('police', conflicts)

if __name__ == '__main__':
    unittest.main()
