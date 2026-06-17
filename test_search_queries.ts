import assert from 'node:assert/strict';
import { normalizeCandidates } from './lib/normalize';
import { buildSearchQueryPlan } from './lib/search-query';
import type { ProviderCandidate } from './lib/providers/types';

const descriptiveQuery = 'Audi A6 Allroad Hydraulic Pump';
const partNumberQuery = '4Z7323167';

const descriptivePlan = buildSearchQueryPlan(descriptiveQuery);
assert.equal(descriptivePlan.kind, 'descriptive');
assert.deepEqual(descriptivePlan.partNumbers, []);
assert.ok(descriptivePlan.variants.includes(descriptiveQuery));
assert.ok(descriptivePlan.variants.includes('Audi A6 Allroad suspension hydraulic pump'));
assert.ok(descriptivePlan.variants.includes('Audi Allroad hydraulic pump'));
assert.ok(descriptivePlan.variants.includes('Audi A6 hydraulic pump'));

const partNumberPlan = buildSearchQueryPlan(partNumberQuery);
assert.equal(partNumberPlan.kind, 'partNumber');
assert.deepEqual(partNumberPlan.partNumbers, [partNumberQuery]);
assert.ok(partNumberPlan.variants.includes(partNumberQuery));

const descriptiveCandidates: ProviderCandidate[] = [
  {
    title: 'Audi A6 Allroad suspension hydraulic pump 4Z7 323 167',
    brand: 'Audi',
    image: 'https://i.ebayimg.com/images/example.jpg',
    store: 'eBay',
    price: 249,
    currency: 'USD',
    productUrl: 'https://www.ebay.com/itm/audi-a6-allroad-hydraulic-pump',
    matchScore: 0.8,
    raw: {}
  }
];

const descriptiveResults = normalizeCandidates(descriptiveCandidates, descriptiveQuery);
assert.equal(descriptiveResults.length, 1);
assert.match(descriptiveResults[0].title, /Audi A6 Allroad/i);

const partNumberCandidates: ProviderCandidate[] = [
  {
    title: 'Audi Allroad Hydraulic Pump OEM 4Z7 323 167',
    brand: 'Audi',
    image: 'https://i.ebayimg.com/images/example-part-number.jpg',
    store: 'eBay',
    price: 299,
    currency: 'USD',
    productUrl: 'https://www.ebay.com/itm/4z7323167',
    matchScore: 0.9,
    raw: {}
  },
  {
    title: 'Audi Allroad Hydraulic Pump OEM 8E0 123 456',
    brand: 'Audi',
    image: 'https://i.ebayimg.com/images/example-wrong-part.jpg',
    store: 'eBay',
    price: 199,
    currency: 'USD',
    productUrl: 'https://www.ebay.com/itm/wrong-part',
    matchScore: 0.9,
    raw: {}
  }
];

const partNumberResults = normalizeCandidates(partNumberCandidates, partNumberQuery);
assert.equal(partNumberResults.length, 1);
assert.match(partNumberResults[0].title, /4Z7 323 167/i);

console.log('Search query classifier, expansion, and normalization tests passed.');
