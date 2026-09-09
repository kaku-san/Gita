# Rath travel adapter

`rath-motion.js` is a standalone ES module intended beside `assembly.js`. Its only import is the existing `./vendor/three.module.min.js`. No source Site file was edited for this asset task.

## Integration

```js
import {createRathMotion} from './rath-motion.js';

// Once, AFTER createAssembly and its character-pose warmup:
const travel = createRathMotion(assembly, {
  distance: 9,
  duration: 10.5,
  renderer,
  shadowLight: lights.sun,
});
if (lessMotion) travel.setTravel(false);

// In the existing actor tick, immediately after the approved assembly update:
assembly.update(time, dt, moving);
const travelState = travel.update(time, dt, moving);

// On an explicit arrival replay:
travel.setTravel(true);

// On scene disposal:
travel.dispose();
```

The adapter captures the root's **final parked local position** at construction. The initial assembly sits 9 metres behind that point along local +Z, reaches the captured position in 10.1 seconds, and finishes its last hoof placements by 10.5 seconds. After that, the existing conversational character and horse idle continues. Existing assembly dimensions and scale are unchanged. Create the adapter after the existing pose warmup so the arrival does not advance invisibly while loading.

If renderer and light are not supplied at construction, call `travel.syncShadows(renderer, lights.sun)` after each `travel.update`. During travel this invalidates the map on every changed actor pose, replacing the current 350 ms delay for the moving near subject. The directional shadow camera and target follow the assembly's displacement together, preserving the light direction. The existing static map policy can continue for parked idle. Native `SkinnedMesh` depth/shadow passes share the exact leg deformation; no special depth shader is required.

The camera may use `travel.state.worldDisplacement` for an arrival tracking offset if needed. This vector is relative to the final parked root, so it begins 9 metres backward and ends at zero. `deltaWorld` is the latest frame displacement. Add the same tracking offset to both camera position and look target; do not also offset scene objects already under `assembly.root`.

## API

| Member | Meaning |
|---|---|
| `setTravel(true)` | Restart from the approach start and play. Applies the start pose immediately. |
| `setTravel(false)` | Park immediately at the final authored pose. Useful for reduced motion. |
| `setTravel(0..1)` | Seek normalized progress and pause; deterministic for review screenshots. |
| `setTravel({progress, playing})` | Seek and/or change play state without forcing a restart. |
| `progress` | Current normalized elapsed arrival time. |
| `update(time, dt, animated)` | Advance when playing and animated; apply travel after `assembly.update`. Returns the shared state object. |
| `state.worldDisplacement` | World-space offset from the captured parked root. |
| `state.distance`, `state.speed` | Local metres travelled from the start; metres per second. |
| `state.arrived`, `state.moving` | Whether the walking passage has finished / still has an arrival pose. |
| `state.shadowDirty` | Pose changed since the previous application. |
| `state.maxReachError` | Largest unreachable foot-target error. Zero in the validated defaults. |
| `state.feet` | Sixteen diagnostic planned foot contacts, including planted state and advance in metres from each original footprint. |
| `dispose()` | Restore original body geometry, skeletons, hoof visibility, suspension parenting, root pose, wheels, and followed light. |

Options also expose `cycle` (default 1 second per complete leg cycle), `hoofLift` (default 0.145 m), and `autoplay` (default true). The 9 m / 10.5 s defaults were validated together; materially faster timings should be rechecked via `state.maxReachError`, since the adapter deliberately does not stretch bones to compensate for an excessive stride.

## Geometry and mechanics

- Adds a native upper-leg, carpus/hock, and hoof bone per leg. Four legs use a lateral-sequence four-beat walk with 75% stance and smooth, short swing arcs. Each planted hoof retains one world-space contact position while the root advances beneath the horse; the final contacts settle into the approved standing coordinates.
- Clones and shares the original body geometry to add skin weights. Its 151,717 vertex positions, topology, original neck/head weights outside the leg regions, UVs, colours, breathing morph, and materials are preserved. The original geometry is retained for restoration.
- Finds the visible merged hoof material surfaces. The `horse.hoofs` array contains detached pre-merge objects and cannot animate the rendered feet. The adapter instead creates skinned render views of the same merged horn walls, caps, and soles.
- Uses modest joint rotations with fixed bone lengths and a restrained 7.5–9.5 cm body lowering while walking, allowing a natural bend instead of reaching with rigid, stretched legs. Every hoof retains its approved shape and dimensions. No replacement animals or rescaling.
- Moves the **whole assembly root**, preserving the fixed relative positions of horse-team hardware, drawpole, clevis, and towing eye. Both wheels turn by travelled distance / 1.5 m radius.
- Adds only 8 mm deck bob and approximately 0.1° carriage roll/pitch. Decks, seats, occupants, canopy, and standard move together; axle, wheels, drawpole, and towing hardware remain coupled. The horse roots receive body bob but no lateral roll that could drive hooves through the floor.
- Refreshes reins after the driver's hand and horse head positions are current. Refreshes each trace's actual collar anchor while retaining the approved routed span. All geometry movement uses native skinning, so normal and shadow geometry agree.

## Numerical checks performed

Used the actual existing horse/team/chariot modules in Node with file-backed local fetch, without a browser, external API, or image generation.

- Swept 631 arrival poses across all 16 legs: zero unreachable IK targets; measured planted hoof-bone drift was at most 3.6e-15 m (floating-point noise).
- Final root translation: exactly the captured parked position. Total travel: 9 m. Both wheels: exactly 6 radians beyond their captured angles.
- Checked every vertex of all four merged hoof views at twelve representative arrival poses with renderer-equivalent `updateMatrixWorld(true)`: lowest sole was 0.00400000019 m, matching the authored ground clearance.
- All hooves begin on the original standing coordinates; the initial highest hoof vertex remains 0.1330000013 m. Rein-to-bit error was at most 1.2e-16 m and trace-to-collar error was zero across the sampled poses.
- All four body position arrays had zero changed values versus the original source geometry.
- Dispose restored all original body geometry and skeleton references and all horse-root positions.

No browser or visual review was performed under this asset-only task. The parent should review the integrated opening framing and the walking silhouette at a few deterministic progress values such as `.11`, `.30`, `.60`, and `.92`.
