Kurukshetra nature asset

Entry point: `nature.js`

```js
import { createNature } from './battle/nature.js';
const nature = createNature({ quality: 'high', groundHeight });
scene.add(nature.root);
nature.update(time, dt, animated);
nature.setVision(amount); // clamped to 0..1; reversible
// nature.dispose(); // safe to call repeatedly
```

The sole dependency is `./vendor/three.module.min.js`. When placed at `web/battle/nature.js`, the parent's `web/battle/vendor/three.module.min.js` should forward `export * from '../../vendor/three.module.min.js';`. No textures, image assets, packages, lights, skies, renderers, browser code, or fetches are used.

Composition:

- Two mature near trees are at `(-58, -6)` and `(64, 14)`. These are the explicitly requested exceptions to the 80 m standing-tree reserve. Their broad crowns stand roughly 11–13 m high, with branching trunks, spreading roots, tapered twigs, overlapping foliage sprays, and fine attached leaflets.
- Other trees form irregular, open groups on both sides, within `|x| = 95..220` and `z = 40..260`. Their minimum trunk radius is 136.44 m. Every root contact follows the supplied ground height.
- The old path is a feathered, transparent sand surface with subdued wheel wear, within approximately `|x| < 9.4`, `z = -68..240`. Its height is `groundHeight + 0.009`; its material has polygon offset and does not write depth. It does not add a separate base terrain.
- Sparse olive and straw grasses occur along the path shoulders, drainage banks, and several outer patches. Every tuft origin has `|x| > 10.58` in high quality and `|x| > 10.67` in low quality.
- The dry drainage mesh is fully inside `x = -92..-74`, `z = 5..170`. It samples the parent's carved ground, then adds low irregular banks from `+0.008` to `+0.491` m. There is no new ground beyond that rectangle. Clay variation and a small amount of embedded gravel give the bed texture. There are no water planes.
- Seven distant gliding bird silhouettes are present in high quality, four in low. Their shader motion and foliage/grass motion share an internal clock.

Numerical verification with a ground callback including the proposed 0.7 m swale:

| Quality | Triangles | Draw calls | Trees | Leaf clusters | Grass tufts |
| --- | ---: | ---: | ---: | ---: | ---: |
| high | 219,002 | 7 | 68 | 2,178 | 1,304 |
| low | 130,013 | 7 | 46 | 1,456 | 659 |

Finite vertex and instance buffers, channel bounds, tree reserve, grass clearance, triangle budgets, pause/resume, vision reset, and idempotent disposal pass. `nature-check.mjs` reproduces these checks against the existing local Three.js dependency. No browser, screenshot, render, or visual QA was used.

`update(time, dt, false)` does not move objects or advance shader time. Resuming with `dt` advances from the frozen state; a resumed absolute `time` without `dt` is bounded to a 0.1 s increment. Long-frame `dt` is similarly clamped. `setVision(1)` darkens opaque materials and fades the transparent path; `setVision(0)` restores their original values.

The parent owns broad landscape undulation and sky/lighting. The asset deliberately follows those choices through `groundHeight` and standard scene lighting. Metadata contains exact placements, counts, reserve bounds, and an `inspect()` accessor for the animation state.
