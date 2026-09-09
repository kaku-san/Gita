# Kurukshetra surroundings

The environment now integrates `web/battle/infantry.js`, `animals.js`, and
`nature.js`, and `army-mass.js`. The owning module is `web/surroundings.js` and its factory is async:

```js
const surroundings = await createSurroundings({quality: 'high'});
scene.add(surroundings.root);
surroundings.update(time, dt, animated);
surroundings.setVision(0); // 0 warm field; 1 dark revelation backdrop
```

All figures use metres, Y up, +Z forward. The rath clearing remains empty within
x [-7,7], z [-12,20]. A second positive-X corridor protects the approved story
camera. Terrain under the approved rath stays at y=-0.027. Every new actor samples
the same `groundHeight` used by the terrain and nature modules.

The field combines paired sword/shield combat, dense reserves across a 2.2 km
square, mounted cavalry,
war elephants, broad trees, grass, dry drainage banks, worn earth, flags and dust.
Runtime animal sculpture buffers are local under `web/battle/animals-skin/`.
The battle modules use the shared Three.js forwarder under `web/battle/vendor/`.
The environment owns no renderer, lights, camera or UI. It exposes `fieldViews`
in metadata so the parent can frame soldiers, cavalry, elephants and a wide view.

`update(..., false)` freezes motion; the parent supplies a paused clock on resume.
`setVision` dims the same resources and returns to the exact original colors at
zero. `dispose()` releases owned GPU resources and is safe to call twice.

Run `node scripts/check-battlefield.mjs` from the Site root for integration checks.
The report is `scripts/battlefield-validation.json`. Independent authoring notes
and numerical asset checks are under `scripts/battle/`. No rendered browser QA
or device frame-rate measurement has been performed.
