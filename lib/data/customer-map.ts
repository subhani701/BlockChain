/** Maps shared ami-data customer IDs to legacy Account Wiki tab keys */
export const customerIdToWikiKey: Record<string, string> = {
  c1: 'continental',
  c2: 'bmw',
  c3: 'autohaus',
  c4: 'continental',
  c5: 'continental',
  c6: 'bmw',
  c7: 'bmw',
  c8: 'continental',
  c9: 'continental',
  c10: 'autohaus',
  c11: 'pacific',
  c12: 'pacific',
};

export const wikiKeyToCustomerId: Record<string, string> = {
  autohaus: 'c3',
  bmw: 'c2',
  continental: 'c1',
  pacific: 'c11',
};

export const worklistCustomerToId: Record<string, string> = {
  'Autohaus Müller': 'c3',
  'BMW Werkstatt': 'c2',
  'Continental AG': 'c1',
  'Mercedes-Benz Group': 'c2',
  'ZF Friedrichshafen': 'c1',
  'Volkswagen AG': 'c1',
  'AutoParts Bayern': 'c4',
  'Bosch Automotive': 'c1',
  'Italia Parts S.r.l.': 'c5',
  'Pacific Parts Ltd': 'c11',
  'Eastern Motors': 'c8',
  'Rhine Valley Distribution': 'c1',
  'Meridian Fleet Services': 'c2',
};
