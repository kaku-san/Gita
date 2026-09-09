// Read-only production estimate. No API requests and no audio generation.
// Prices are a dated planning snapshot; verify the selected voices before purchase.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { flowCopy } from '../web/narrative/flow-copy.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const active = new Set(JSON.parse(read('production/narration/active-passage-ids.json')));
const characters = text => [...text].length; // Unicode code points, including spaces/punctuation.
const languages = {};
for (const lang of ['en', 'hi', 'ja', 'zh-Hans', 'fr']) {
  const all = read(`production/narration/${lang}/recordings.jsonl`).trim().split('\n').map(JSON.parse);
  const rows = all.filter(row => active.has(row.id));
  if (rows.length !== active.size || new Set(rows.map(row => row.id)).size !== active.size) {
    throw new Error(`Missing or duplicated active IDs: ${lang}`);
  }
  const roles = {};
  for (const row of rows) {
    if (createHash('sha256').update(row.text).digest('hex') !== row.textSha256) {
      throw new Error(`Spoken text hash mismatch: ${lang}/${row.id}`);
    }
    const role = roles[row.speakerKey] ??= { clips: 0, characters: 0 };
    role.clips++;
    role.characters += characters(row.text);
  }
  const storyCharacters = rows.reduce((sum, row) => sum + characters(row.text), 0);
  const openingCharacters = flowCopy[lang].opening.reduce((sum, row) => sum + characters(row.text), 0);
  languages[lang] = {
    storyClips: rows.length, storyCharacters, roles,
    openingClips: flowCopy[lang].opening.length, openingCharacters,
    totalCharacters: storyCharacters + openingCharacters,
    maximumStoryPassageCharacters: Math.max(...rows.map(row => characters(row.text))),
  };
}
const sum = key => Object.values(languages).reduce((n, row) => n + row[key], 0);
const total = sum('totalCharacters');
const auditionAllowance = 10000;
const apiUsdPer1000Characters = 0.10;
const money = n => Math.round(n * apiUsdPer1000Characters / 1000 * 100) / 100;
const withRetakes = Math.ceil(total * 1.5) + auditionAllowance;
const fullSecondPass = total * 2 + auditionAllowance;
console.log(JSON.stringify({
  checkedDate: '2026-09-09',
  methodology: 'Exact submitted story text plus opening caption text; Unicode code points, including spaces and punctuation. Excludes labels, direction tags, Sanskrit recitation and study meanings. Billing estimate assumes standard-rate voices and must be reconciled against the API usage receipt.',
  sources: {
    apiPricing: 'https://elevenlabs.io/pricing/api',
    subscriptionFeatures: 'https://elevenlabs.io/pricing',
    voiceMultipliers: 'https://elevenlabs.io/docs/eleven-creative/voices/voice-library',
    legacyMigration: 'https://elevenlabs.io/blog/weve-lowered-api-agents-pricing-and-introduced-pay-as-you-go',
  },
  languages,
  totals: { storyClips: sum('storyClips'), storyCharacters: sum('storyCharacters'), openingClips: sum('openingClips'), openingCharacters: sum('openingCharacters'), totalClips: sum('storyClips') + sum('openingClips'), totalCharacters: total },
  apiUsdPer1000Characters,
  scenarios: {
    firstPass: { characters: total, usageEquivalentUsd: money(total) },
    auditionsAnd50PercentRetakes: { characters: withRetakes, usageEquivalentUsd: money(withRetakes) },
    auditionsAndCompleteSecondPass: { characters: fullSecondPass, usageEquivalentUsd: money(fullSecondPass) },
  },
  recommendation: {
    plan: 'Creator monthly using API pricing',
    standardMonthlyUsd: 22,
    eligibleFirstMonthUsd: 11,
    advertisedV3OrV2ApiCharacterAllowance: 220000,
    customVoiceSlots: 30,
    proposedRoleSlots: 15,
    headroomAfterAuditionsAndCompleteSecondPass: 220000 - fullSecondPass,
    assumptions: ['Unused full monthly allowance', 'Standard-rate voices', 'One production billing cycle', 'No tax included', 'No language editor, sound design, soundtrack or Sanskrit recitation fees included', 'First-month discount subject to account eligibility', 'No extra 50-percent API promotion applied to the displayed unit rate', 'API allowance and Creative UI credits are not additive'],
  },
}, null, 2));
