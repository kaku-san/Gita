# Geeta page UX audit — revision 9

Source-only review of `web/index.html`, `app.js`, `style.css`, `experience.css`, `experience/opening-credits.css`, and the journey, narration, reading-clock, exploration and world modules. No browser, preview, screenshots, computed-style API or DOM inspection was used. The CSS conclusions below trace stylesheet order and selector specificity from source; device rendering still needs visual validation. The approved opening should remain unchanged.

## Prioritized findings

### 1. High — opening Shloka leaves the camera guide almost no usable space

**Source-confirmed.** `app.js:30–36` sets `--paper-top` to the source panel's top whenever source is open. `experience.css:152–156` sizes the camera guide to `min(340px, calc(var(--paper-top) - 140px))`. Portrait study height is `58dvh`, above a 112px dock, while the guide retains 18px padding from `style.css:54`.

At a 640px-tall portrait viewport with zero safe inset, source top is `640 - .58*640 - 112 = 156.8px`; guide max-height is therefore **16.8px**, less than its 36px vertical padding. A bottom safe inset reduces the available space further. In short landscape, the source top is 70px (`experience.css:241`), the camera buttons start at 26px (`:256`), and the guide's bottom edge is 12px below the viewport top (`:154`). This also places camera actions over the masthead.

**Impact:** Shloka and Look around are separately usable controls whose combined state produces a collapsed or displaced guide; in landscape the camera controls compete with navigation.

**Minimal correction:** Make study and the expanded guide mutually exclusive. Opening study closes the guide and resets `aria-expanded`; hide the camera tool row while study is open. Returning from study restores the normal row. If simultaneous access is necessary, give the guide its own viewport-bounded sheet instead of deriving its size from the remaining strip above study. Validate portrait 320×640 and a short landscape viewport, including safe insets.

### 2. Medium — the fullscreen menu discards the mobile top safe area

**Source-confirmed CSS omission; physical obstruction requires device validation.** The earlier portrait dialog rule in `style.css:57` reserves top space using a reduced `max-height`. The later, more specific `#menu` rule (`experience.css:285`) overrides it with `height:100dvh; max-height:100dvh; margin:0 0 0 auto`. Its final mobile header rule is only `padding:20px 24px 16px` (`:308`). The page explicitly uses `viewport-fit=cover` in `index.html`.

**Impact:** The page masthead accounts for `safe-area-inset-top`, but the full-screen menu title and close control do not. Their placement can conflict with device chrome or a cutout. This is a menu consistency issue, not an argument for redesigning the drawer.

**Minimal correction:** Add the top safe inset to the final menu header padding, and account for left/right safe insets in landscape. Preserve the existing sticky close row, serif title, thin chapter separators, current-chapter mark and plain text section controls. Verify the close button stays fully visible and reachable with long localized headings.

### 3. Medium — the Read progress line changes what it measures on pause

**Source-confirmed.** `app.js:62` uses `readingClock.progress * 100` while playing, but `at / chapterEntries.length * 100` while paused. The count next to it already reports passage position. Thus pausing halfway through an early passage can jump the line from 50% to a small chapter fraction; restarting jumps it back. It also changes interpretation on every automatic passage boundary.

**Impact:** The one visible progress cue gives contradictory feedback precisely when a reader pauses to study or scroll. `setSource()` and touching the reading scroll both pause reading, so this affects common study interactions.

**Minimal correction:** Keep the numeric count as chapter position and make the line consistently represent the current passage clock. Retain its value on pause; reset on `readingClock.set()`, and show completion when the passage ends. An unstarted manual passage can use an empty line. If chapter progress is preferred instead, keep it as chapter progress in both playback states; do not switch units.

### 4. Medium, latent — recorded narration would replace source material during study

**Source-confirmed interaction; currently dormant because recordings are pending.** `setSource()` (`app.js:102`) pauses `readingClock` only. The narrator completion callback (`:20`) continues to `choose()` in Listen mode. `choose()` (`:124–129`) resets the selected verse and source scroll, while `renderStudy()` rebuilds scene meaning and verse content (`:103–117`). Opening menus, by comparison, explicitly pauses narration (`:166`).

**Impact once recordings arrive:** Someone studying a selected shloka can have its text and scroll position replaced when the current recording ends. The small “Follows the current passage” footer discloses following, but it offers no control over that interruption.

**Minimal correction:** Pause narration when source opens, matching the existing reading-clock behavior. Retain position and let the listener explicitly resume afterward. If listening while studying is a deliberate product requirement, freeze the source selection until it closes and label that state instead of silently rebuilding it. Verify with actual completion events when recordings are integrated.

### 5. Readiness/labeling — Listen is selectable before any narration exists

**Source-confirmed, intentionally pending; not a broken audio implementation.** `narrative/audio.json` has `status: "awaiting-recordings"` and empty maps for all five languages. `setMode('listen')` hides the passage (`app.js:51,138–139`), then `renderAudio()` correctly disables playback and displays the missing-recording notice with “Read the story” (`:131–136`).

**Impact:** Availability becomes clear only after the mode switch has removed the readable text. The recovery already exists and should be retained.

**Minimal correction:** Mark narration as pending beside Listen before selection, or explain availability while keeping the current passage visible until a playable track exists. Do not substitute battlefield ambience for narration. The late `.play-button` rule (`experience.css:107–111`) also makes this disabled control a filled cream square: for the conversation controls, a plain icon with the same 48px hit area would better match the existing menu's restrained line-and-type treatment. This styling judgment needs visual validation; leave opening controls alone.

### 6. High — completion has no distinct destination

**Source-confirmed.** `narrative/journey.js:8` intentionally excludes the concluding Sanjaya passage, so the experience ends at **Arjun's response, 18.4.4**. `app.js:44` disables Next there. Reading completion only calls `renderPaced()` (`:18`), narrator completion does nothing further (`:20`), and `director.go()` clamps further requests back to the final index (`journey.js:48–51`). The page has no completion state or end actions.

**Impact:** The final response looks like an ordinary passage with a disabled arrow. Manual readers cannot deliberately complete it, and timed readers receive no transition or resolution.

**Restrained correction matching the approved direction:**

1. Keep Arjun's whole final response readable. In manual Read, replace the disabled final Next action with a clearly labeled **Finish** action. Timed Read and future recorded Listen should finish from their actual completion callbacks.
2. Let the final response give way to a quiet hand-and-bow beat, then a roughly **15-second continuous pullback from the camera's actual current pose**. Keep the live field and its sound. Avoid a camera reset, new montage, flash or abrupt fade to another scene.
3. Introduce the existing Geeta wordmark and a small closing line near the end of that movement. Keep the text readable against the current field using the existing muted dark treatment.
4. Offer three plain text actions, each with at least a 44px hit area: **Revisit chapters**, **Stay on the field**, **Begin again**. Reuse the menu's thin rule, gold focus/hover and serif hierarchy instead of a group of filled cards. Revisit opens the existing chapter drawer; Stay dismisses the ending text and leaves an accessible route back to navigation; Begin again explicitly resets the journey and reuses the approved opening.
5. Respect the existing fixed-camera/reduced-motion setting by holding the view and introducing the closing typography without the pullback. Make completion idempotent and stop the reading/narration transport before the closing phase. Focus the closing heading once actions become available, and retain a normal keyboard route to all three actions.

## What is already supported by the source

The main passage and parchment study surfaces have solid backgrounds and deliberately contrasting text colors. Most transport, menu and study controls keep 44–48px targets. Native dialogs provide modal behavior; the source close action returns focus to its trigger. “Meaning of this scene” is explicitly explained as an adaptation-level explanation rather than a translation of the selected verse, so it should not be reported as an accidental verse mismatch. The legacy idle-hide behavior is effectively disabled by both `scheduleHide()` and the later stylesheet overrides. The world camera uses a continuous rig and exploration captures its actual current pose; preserve that foundation for the ending.

## Remaining visual validation

After the minimal changes, inspect: long Hindi/Japanese/French passage wrapping at small widths; the source panel's usable scroll height; the full-screen menu with safe insets; focus rings on the light study background; and the ending pullback with both ordinary motion and Hold camera still. These are validation needs, not claims of observed visual defects. No visual testing was performed in this audit.
