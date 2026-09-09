# Arjun prayer pose adapter

`prayer-pose.js` is a complete optional adapter for the approved Arjun element. It uses injected Three.js and requires no edits to `elements/arjun/character.js`, no additional skin downloads, and no replacement character parts.

Copy `prayer-pose.js` to the Site's `web/` folder and import it from the assembly:

```js
import {createPrayerPose} from './prayer-pose.js';

// After createArjun(), mounting it, and creating the rest of the assembly:
const prayer = createPrayerPose(arjun, {THREE: T, floorY: .12});

// In the frame update, after the authored character animation:
arjun.update(time, dt, true);
prayer.update(teachingWeight, time);
chariot.supports.arjun.visible = teachingWeight <= .00001;
```

`teachingWeight` is a smoothly eased number from 0 (original seated character) to 1 (kneeling, both palms joined, a modest head inclination). The adapter hides the detachable character seat and held bow while active. The original character seats in `chariot.seats` are already hidden by the existing assembly. Also hide `chariot.supports.arjun` during the teaching pose: its original dais otherwise intersects the folded lower legs. Restore that support at weight 0. The adapter does not touch the chariot or Krishna.

Arjun faces local +Z, already toward Krishna in the approved assembly. If the final staging moves the figures laterally, call the optional function with Krishna's world position:

```js
krishna.root.getWorldPosition(teacherWorld);
prayer.faceToward(teacherWorld, teachingWeight);
```

Use `floorY: .12` for the existing warrior mount at Y 1.96 and deck at Y 2.08. The value is in Arjun-root local coordinates. Its default is correct at the original uniform scale.

## API

- `update(weight, time)`: apply after every `arjun.update`, with the same animation time. Use weight 0 before returning to the original pose. Do not replace `arjun.update` with this call; the original update supplies the current baseline right-arm and head rotations and the approved cape motion.
- `faceToward(worldPoint, weight = 1)`: optional yaw toward Krishna, blended from the original root orientation.
- `diagnostics()`: geometry counts, wrist world coordinates, target knees/ankles, and minimum lower-garment height.
- `dispose()`: restore original geometry references, skeleton, hands, root orientation, bow and seat visibility; remove the optional bones and hands.
- `bones`: the three new left-arm bones.
- `hands`: the two posed copies of the original open-hand geometry.
- `manageBowVisibility` / `manageSeatVisibility` constructor options: default true; set false when a scene-specific animation owns these visibilities.

## Geometry treatment

- The approved body remains the same 58,044-vertex mesh. Its original five bones and binding matrices remain intact; three left-arm bones and 11,377 anatomically selected left-arm weights are added.
- The original left hand survives static merging in one dedicated skin-material mesh. Applying the exact inverse of its authored transform recovers the 16,733-vertex open-hand surface, used for both joined palms. This is the approved hand, not generated replacement anatomy.
- Left-arm armour is selected by connected indexed surface islands. The original pauldron/bracer pieces move rigidly; torso armour, medallion, head, hair, quiver, cape, and original materials remain intact. Whole pauldron rivet sets follow their armour.
- Both existing linen leg sweeps retain their vertices, cross-section thickness, folds and UVs. Their rings are transported from the seated leg curves onto folded thigh/shin curves, with feet turned backward. A shallow contact patch flattens only the lowest knee/shin pleats against the deck.
- The existing burgundy waist panel, apron, embroidery, belt, sandals and apron beads deform along with the lower body. Torso descent is .38 units; the fitted cape's original hem remains just above the deck.

## Verification

Run `node scripts/check-prayer-pose.mjs` in this workspace. The script reads the approved Site source without modifying it, uses a local-file fetch shim, and needs no browser/WebGL.

Verified on a rotated and translated parent mount, at weights 0, .25, .5, .75, 1, repeated 1, and back to 0:

- All body coordinates remain finite; materials and mesh vertex counts remain unchanged.
- Original hand recovery maximum error: 6.71e-8 units.
- Joined wrists: .0934 units apart; minimum gap between the approved inward-facing palm surfaces: .0001734 units.
- No lower garment or sandal extends below the original local deck plane Y .12.
- Neutral body binding matches the original skeleton numerically; `dispose()` restores the original geometry and skeleton identities.

The adapter has had numerical QA only. Review it in the parent task's approved browser/visual pass, including the side view of the folded legs and the front view of the joined hands. The explicit topology checks intentionally reject a different replacement character mesh.
