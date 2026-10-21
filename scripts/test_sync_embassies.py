import unittest
from sync_embassies import contacts, discover, merge, normalize_phone

class SyncTests(unittest.TestCase):
    def test_labeled_contacts_and_officer_separation(self):
        page = contacts('<p>Phone: +61 2 8326 9777</p><p>Email: consular.sydney@mofa.gov.bd</p><table><tr><th>Name</th><th>Designation</th><th>Phone</th></tr><tr><td>Test Official</td><td>Consul</td><td>0123456789</td></tr></table>', 'https://sydney.mofa.gov.bd/')
        self.assertEqual(page['fields']['phone'], ['+61283269777'])
        self.assertEqual(page['fields']['email'], ['consular.sydney@mofa.gov.bd'])
        self.assertEqual(len(page['officers']), 1)

    def test_preserves_values_and_deduplicates_officers(self):
        page = contacts('<p>Phone: +61 2 8326 9777</p>', 'https://sydney.mofa.gov.bd/')
        page['officers'] = [{'name': 'Example Name', 'imageUrl': None}]
        original = {'phone': '+1234567890', 'verified': True, 'officers': []}
        updated, conflicts = merge(original, [page, page], '2026-10-21')
        self.assertEqual(updated['phone'], original['phone'])
        self.assertIn('phone', conflicts)
        self.assertEqual(len(updated['officers']), 1)
        self.assertEqual(original['officers'], [])
        self.assertNotIn('lastVerified', updated)

    def test_conflicting_contacts_are_not_promoted(self):
        pages = [contacts(f'<p>Phone: {phone}</p>', 'https://sydney.mofa.gov.bd/') for phone in ['+61283269777', '+61283269778']]
        updated, conflicts = merge({}, pages, 'now')
        self.assertNotIn('phone', updated)
        self.assertIn('phone', conflicts)

    def test_exact_directory_match_only(self):
        records = [{'name': 'Consulate General, Sydney'}]
        self.assertEqual(discover('<table><tr><td>Consulate General, Sydney</td><td><a href="https://sydney.mofa.gov.bd/">Website</a></td></tr></table>', records), {0: 'https://sydney.mofa.gov.bd/'})
        self.assertEqual(discover('<a href="https://sydney.mofa.gov.bd/">Sydney</a>', records), {})

    def test_phone_normalization(self):
        self.assertEqual(normalize_phone('+213 (0) 552181818'), '+213552181818')
        self.assertIsNone(normalize_phone('123 / 456'))

if __name__ == '__main__':
    unittest.main()
