# Geeta battle animals

Entry: `animals.js`. Import `createBattleAnimals` and await creation. Call `update(time,dt,animated)` each frame; `animated=false` exactly freezes the current pose. `setVision(0..1)` smoothly darkens the ensemble to indigo during Vishvarupa and restores original materials exactly at zero. Call `dispose()` when replacing the ensemble.

```js
import {createBattleAnimals} from './battle/animals.js';
const animals = await createBattleAnimals({quality:'high',groundHeight});
scene.add(animals.root);
animals.update(time,dt,animated);
animals.setVision(visionAmount);
```

Copy `animals.js`, `animals-geometry.js`, and `animals-skin/` together. Their Three.js import is `./vendor/three.module.min.js`; the Site supplies a forwarder to its single approved runtime in `web/vendor/`. The exact runtime skin set is:

- `horse-high.bin/.json`, `horse-low.bin/.json`
- `elephant-high.bin/.json`, `elephant-low.bin/.json`
- `rider-high.bin/.json`, `rider-low.bin/.json`
- `head-high.bin/.json`, `head-low.bin/.json`
- `horse-tack.json`

`elephant-sculpture.bin/.json` and `elephant-landmarks.json` are regeneration artifacts; runtime does not fetch them.

High: 8 elephants, 32 cavalry, 48 mounted humans; 1,357,898 rendered triangles and 5 forward draw calls, before any parent shadow passes. Low: 6 elephants, 24 cavalry, 36 humans; 687,354 triangles and 3 draws. Four high-quality elephants and six high-quality cavalry share their respective geometries. All remaining creatures use shared LOD geometry. All surfaces, tack, human figures and weapons within a batch render together with material parameters stored per vertex. Local soft ground shadows are instanced separately.

Elephants have a continuous authored Asian elephant sculpture, forehead domes, curved tusks, independent ears and trunk sections, toes, tail, embroidered caparison, mahout and guarded howdah. They remain planted with weight transfer. The howdah finial is 5.91 m above flat ground; the guard's spear reaches about 6.44 m. Cavalry preserves the approved horse sculpture in spatially clustered LODs; four independent multi-segment leg rigs use terrain-aware stance anchors, rigid grounded hooves, smooth swing phases and closed patrol paths. Mane, tail and head have separate small motions. Riders use the approved continuous rider/head sculptures with added armour, divided riding cloth, helmets, shields and lances.

Focal elephant: `[-16,3.2,30]`, camera `[-5,7.6,19]`. Focal cavalry: `[-24,2.2,60]`, camera `[-13,5.4,48]`. Additional rearward elephants are at `[-18,-18]` and `[34,-22]`; six rearward cavalry occupy the left lane. `metadata.placements`, `metadata.tracks`, `metadata.bounds` and `metadata.focalCameraAnchors` expose scene integration data. The central chariot aisle and positive-X story camera rectangle remain clear.

Regenerate all sculpture data using `python scripts/battle/animals/animals-sculpt.py`. Original approved binary inputs are saved under `scripts/battle/animals/approved-inputs/`; no approved project file is modified. Check using `node scripts/battle/animals/animals-check.mjs`. This checks local loading, finite geometry, valid indices and weights, the actual local Three.js shader hooks, 30 seconds of terrain-aware motion, zero stance skating, exact freeze, protected lanes and both budgets. Results are in `scripts/battle/animals/animals-validation.json`. No browser or visual QA was performed under the asset-only task constraint.
