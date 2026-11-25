/**
 * Generates docs/trip.schema.json (JSON Schema draft-07) from shared/trip.ts.
 * Hand this file to any AI agent that should produce Planny trips.
 * Run: npm run schema
 */
import { writeFileSync } from 'node:fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { TripInputSchema } from '../shared/trip.js';

const schema = zodToJsonSchema(TripInputSchema, {
  $refStrategy: 'none',
  effectStrategy: 'input',
  target: 'jsonSchema7',
}) as Record<string, unknown>;

// Strip fields the app manages itself so agents never try to fill them.
const APP_MANAGED = ['id', 'done', 'doneBy'];
function strip(node: unknown): void {
  if (!node || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  if (obj.properties && typeof obj.properties === 'object') {
    const props = obj.properties as Record<string, unknown>;
    for (const key of APP_MANAGED) delete props[key];
  }
  Object.values(obj).forEach(strip);
}
strip(schema);

const out = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://planny.app/trip.schema.json',
  title: 'Planny trip (v1)',
  ...schema,
};

writeFileSync(new URL('../docs/trip.schema.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log('✓ docs/trip.schema.json written');
