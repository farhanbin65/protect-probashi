import unittest
from sync_embassies import contacts, discover, merge, normalize_phone, page_priority, pick_office_email

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

    def test_location_fallback_and_direct_officer_link(self):
        records = [{'name': 'Long official mission name', 'location': 'Austria (Vienna)'}]
        html = '<table><tr><td>Austria (Vienna)</td><td><a href="http://vienna.mofa.gov.bd/pages/officers-profile">Short mission name</a></td></tr></table>'
        self.assertEqual(discover(html, records), {0: 'https://vienna.mofa.gov.bd/'})
        self.assertEqual(discover(html, records, officer_pages=True), {0: 'https://vienna.mofa.gov.bd/pages/officers-profile'})
        self.assertEqual(discover(html, records * 2), {})

    def test_verification_is_preserved(self):
        updated, _ = merge({'verified': True, 'lastVerified': '2026-01-01'}, [], 'now')
        self.assertTrue(updated['verified'])
        self.assertEqual(updated['lastVerified'], '2026-01-01')
        updated, _ = merge({}, [], 'now')
        self.assertFalse(updated['verified'])

    def test_contact_ranking_uses_link_labels(self):
        self.assertGreater(page_priority('https://x.mofa.gov.bd/pages/123', 'Contact us'), page_priority('https://x.mofa.gov.bd/pages/officers-profile/person'))
        self.assertGreater(page_priority('https://x.mofa.gov.bd/pages/passport'), page_priority('https://x.mofa.gov.bd/pages/officers-profile'))

    def test_email_scores_do_not_guess_personal_or_tied_addresses(self):
        self.assertEqual(pick_office_email(['john.smith@mofa.gov.bd', 'consular.x@mofa.gov.bd', 'mission.x@mofa.gov.bd']), 'mission.x@mofa.gov.bd')
        self.assertIsNone(pick_office_email(['john.smith@mofa.gov.bd']))
        self.assertIsNone(pick_office_email(['mission.a@mofa.gov.bd', 'mission.b@mofa.gov.bd']))

    def test_addresses_in_tables_and_paragraphs(self):
        page = contacts('<table><tr><td>Address:</td><td>57 Culgoa Circuit, ACT 2606, Australia</td></tr></table>', 'https://x.mofa.gov.bd/contact', 'Australia')
        self.assertIn('57 Culgoa Circuit, ACT 2606, Australia', page['fields']['address'])
        page = contacts('<p>57 Culgoa Circuit, ACT 2606, Australia</p><p>Call reference 12345</p>', 'https://x.mofa.gov.bd/contact', 'Australia')
        self.assertEqual(page['fields']['address'], ['57 Culgoa Circuit, ACT 2606, Australia'])

    def test_head_contact_fallback_is_labelled_and_not_used_over_office(self):
        person = {'name': 'Example', 'designation': 'Ambassador', 'phone': '+1234567890', 'email': 'example@mofa.gov.bd', 'sourceUrl': 'https://x.mofa.gov.bd/officers'}
        updated, _ = merge({'officers': [person]}, [], 'now')
        self.assertEqual(updated['phone'], person['phone'])
        self.assertEqual(updated['fieldSources']['phone']['contactType'], 'headOfMission')
        self.assertIn('individual', updated['phoneNote']['en'])
        updated, _ = merge({'officers': [person], 'email': 'office@example.org'}, [], 'now')
        self.assertNotIn('phone', updated)

    def test_bank_and_honorary_contacts_are_not_office_contacts(self):
        for title in ['Honorary Consulates', 'Bank Details for Depositing Consular Fees']:
            page = contacts(f'<title>{title} | Pages</title><p>Phone: +1234567890</p><p>Email: mission.x@mofa.gov.bd</p><p>Branch Address: 12 Example Road 12345 India</p>', 'https://x.mofa.gov.bd/page', 'India')
            self.assertTrue(all(not values for values in page['fields'].values()))

    def test_plain_address_section(self):
        page = contacts('<p>Address</p><p>24 Example Road</p><p>Chennai 600018 India</p><p>Contact Numbers</p><p>Phone: +1234567890</p>', 'https://x.mofa.gov.bd/contact', 'India')
        self.assertIn('24 Example Road Chennai 600018 India', page['fields']['address'])

    def test_phone_normalization(self):
        self.assertEqual(normalize_phone('+213 (0) 552181818'), '+213552181818')
        self.assertIsNone(normalize_phone('123 / 456'))
        self.assertIsNone(normalize_phone('+90-312-4952719-20'))
        self.assertIsNone(normalize_phone('+962 6 5529192 - 93'))
        self.assertIsNone(normalize_phone('+(84-024) 3771 6625'))

if __name__ == '__main__':
    unittest.main()
