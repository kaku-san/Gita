# Chapter XI universal-form sculpture

Runtime entry: `vishvarupa.js`. Copy this entire `vision` directory into the parent
site's `web/vision/`. Its thin Three.js forwarder expects the existing parent
`web/vendor/three.module.min.js`; it does not bundle a second Three.js engine.

```js
import { createVishvarupa } from './vision/vishvarupa.js';
const vision = await createVishvarupa({ quality: 'high' });
scene.add(vision.root);
vision.root.position.set(0, 0, 36);
vision.root.scale.setScalar(3);
vision.root.rotation.y = Math.PI; // if the camera is behind the +Z-facing sculpt

// On the parent scene's animation clock:
vision.update(timeSeconds, deltaSeconds, animated);
vision.setReveal(visibility);  // 0..1, opaque alpha-hashed surface reveal
vision.setDread(dread);       // 0..1, restrained dark/warm colour shift
vision.setGentle(gentle);     // 0 cosmic, 1 crowned four-armed reassuring form
```

The model is Y-up, faces +Z, and has grounded soles at y=0. At authored scale it
is 13.185 units high, 13.599 wide and 2.975 deep. The central four-armed form has
its own precise `metadata.gentleHeight`; `metadata.focus` is a useful torso/head
focus. `metadata.height` is the full cosmic height. The parent owns placement,
whole-object scaling, cameras, illumination, cosmos, particles, and story timing.

`setGentle(1)` leaves one crowned face and four arms. The upper hands carry a
modelled pierced discus and a fluted mace, and the relaxed lower hands remain
open. The other eight faces and fourteen arms retract together toward the upper
torso and fade. Call `setGentle(0)` to restore the full sculpture. `setReveal(0)`
also hides the root. All state and materials are independent per instance.

`metadata.materials` and `metadata.outerMaterials` expose the owned materials for
the parent's universe-within-body treatment. The central materials already use
`onBeforeCompile` for a tiny breathing deformation; chain that callback if adding
a shader. `metadata.centralGroup` and `metadata.outerGroup` expose the two layers.
The sculpture adds no lights, environment maps, postprocessing, DOM, or motion
outside its own root. `update(..., false)` freezes its animation. `dispose()`
removes the root and frees its owned render geometry/materials.

## Geometry and verification

High quality: **886,568 rendered triangles, 46 geometry draw calls**, including
all instanced ornament. Shadow passes are additional. `quality: 'medium'` reduces
the central crown and accessory tessellation. Skin geometry is shared read-only
in a module cache; merged render buffers and all material state belong to each
created instance.

Numeric verification checks finite positions and normals, valid indices,
grounded soles, the 900k/90-draw budget, reveal and gentle transitions, dread
updates, and ownership across two independent instances. No browser or rendered
visual check was performed in this isolated asset task.

```sh
node scripts/check.mjs /absolute/path/to/the/parent/web/vendor
```

## Asset inputs and provenance

- `scripts/approved_anatomy.py`: copied read-only from the approved Dashavatar
  study's analytic sculpt source. It supplies the calm head, standing anatomy,
  feet, and open palm fields. Faces intentionally retain their minimal approved
  sculptural features; there are no painted cartoon eyes.
- `scripts/meshing.py`: the approved marching-tetrahedra exporter, changed only
  to target this asset's `skin` directory.
- `scripts/sculpt_vision.py`: new, authored arm/neck mantle fields, retained upper
  arms, hand teaching/grasp variations, and layout. Requires numpy and scipy.
  Run it to regenerate all `.bin` and `.json` skins plus `layout.js`.
- `geometry.js` and `royal-costume.js`: copied approved shape/drapery helpers;
  ornament tessellation was reduced for this larger multi-headed sculpture.
- `vishvarupa.js`: new crowns, ornaments, garment assembly, discus, mace,
  material consolidation, and public transition API.
- `skin/*`: generated positions, smooth normals, Uint32 triangle indices, and
  JSON descriptors. Binary layout is `vertices*3` Float32 positions, then the
  same number of Float32 normals, then `indices` Uint32 values.
- `layout.js`: authored head and arm positions, hand directions, and pose labels.

There are nine faces and eighteen anatomically curved arms in the universal
silhouette. The outer arms and ascending necks are blended before mesh export,
so their anatomy is a continuous surface rather than live spheres or cylinders.
Gold and gems use small conventional ornament surfaces. The represented Chapter
XI progression is universal form, dread, crowned four-armed reassurance, then
the parent's familiar Krishna figure; this is not a ten-avatar presentation.
