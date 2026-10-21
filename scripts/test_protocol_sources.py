import unittest
from protocol_sources import scoped_fields, crosscheck, london_document_fields

class ProtocolTests(unittest.TestCase):
    def test_wellington_excludes_honorary_consul(self):
        fields = scoped_fields('<main><p>Physical address</p><p>2-6 Gilmer Terrace</p><p>6011 Wellington New Zealand</p><p>Tel +64 22 531 4441</p><p>Email mission.wellington@mofa.gov.bd</p><h2>Other consular contacts</h2><p>Physical address 57 Upland Road</p><p>Tel 04 475 9667</p></main>', 'New Zealand', 'Wellington')
        self.assertEqual(fields['phone'], '+64225314441')
        self.assertNotIn('Upland', fields['address'])
        self.assertEqual(scoped_fields('<p>Chancery wrong office</p>', 'Australia', 'Sydney'), {})

    def test_complete_records_are_not_fetched(self):
        class Fetch:
            def get(self, url):
                raise AssertionError('Should not fetch')
        self.assertEqual(crosscheck([{'country': 'New Zealand', 'city': 'Wellington', 'phone': '123', 'email': 'a@b.nz', 'address': 'Present'}], [0], Fetch(), 'now'), [])

    def test_conflicting_existing_contacts_are_preserved(self):
        class Fetch:
            def get(self, url):
                return '<main>Physical address<p>10 Example Road 6011 Wellington New Zealand</p>Tel +64 22 531 4441<p>Email mission.wellington@mofa.gov.bd</p></main>', url
        records = [{'country': 'New Zealand', 'city': 'Wellington', 'phone': '+64111111111'}]
        report = crosscheck(records, [0], Fetch(), 'now')
        self.assertEqual(records[0]['phone'], '+64111111111')
        self.assertIn('phone', report[0]['missions'][0]['conflicts'])
        self.assertIn('address', records[0])

    def test_london_document_is_scoped_to_bangladesh(self):
        import io, zipfile
        raw = io.BytesIO()
        xml = '<root xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">' + ''.join('<text:p>' + line + '</text:p>' for line in ['OTHER COUNTRY', 'Phone: 020 1111 1111', 'BANGLADESH', 'High Commission for Bangladesh', '28 Queen’s Gate, London, SW7 5JA', 'Phone: 020 7584 0081', 'Email:mission.london@mofa.gov.bd/bhclondon@btconnect.com', 'Hours: Monday-Friday']) + '</root>'
        with zipfile.ZipFile(raw, 'w') as z:
            z.writestr('content.xml', xml)
        fields = london_document_fields(raw.getvalue())
        self.assertEqual(fields['phone'], '+442075840081')
        self.assertEqual(fields['email'], 'mission.london@mofa.gov.bd')
        self.assertIn('SW7 5JA', fields['address'])
