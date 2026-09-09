# Geeta ending proposal

Status: proposed, not implemented. The approved live Three.js opening and existing experience remain unchanged. Based on source revision 8e252d1e149b588ec9736f42fd03e209283858cd. No browser visual testing was performed.

## Current behavior

The last active passage is Arjun's reply, `18.4.4`, adapted from the final Chapter XVIII scene. Its final words are: “I stand steady, free of doubt. I will act according to your word.” The Next control is disabled at this passage. Reading autoplay and recorded narration completion have no ending action. The runtime starts releasing the kneeling pose and restoring the bow upon selecting this passage, and retargets to the usual chariot composition. There is no ending state, closing film, or end screen.

The source staging already calls for a close view of Arjun's hand taking the bow, mirroring the beginning. This provides the visual reason for the ending. Pose restoration must be assessed against the actual approved figure; restoring the original pose alone is not proof of a convincing rise to standing.

## Recommended sequence

Time begins after the final response is complete, or after the reader explicitly finishes it.

| Time | Picture | Sound and text |
| --- | --- | --- |
| 0–4 seconds | Hold on Arjun and the bow. Complete a restrained, anatomically sound return from the prayer pose; show the steady hand. Krishna remains beside him. | Leave the final words readable briefly, then fade the dialogue. Preserve the user's current lighting. |
| 4–16 seconds | One continuous, slow camera pullback reveals the chariot between the two armies. Retarget the existing rig from its current position and rotation. Keep flags, horses, dust and distant fighters alive. | Gradually soften the battlefield mix, retaining very quiet wind. Do not interrupt the final audio line. |
| 16–21 seconds | The same moving field settles into a wide view. The Geeta wordmark appears with restrained typography and a translucent dark veil. | Let the title settle before enabling the end actions. No additional narration is required. |
| After 21 seconds | Quiet end screen over the live field. | Display the three actions below. |

Proposed end-screen text:

- Title: गीता / GEETA
- Reflection: What will you carry with you?
- Primary action: Revisit chapters
- Secondary actions: Stay on the field · Begin again

Use the existing title typography and palette, generous spacing, simple text actions, and a single responsive column on phones. The reflection is authored interface text, not a Sanskrit quotation or a claimed translation.

## Entry and exit behavior

- Manual Read: the last Next control becomes an explicitly labeled Finish action. Never time the reader out of a manually read final passage.
- Read autoplay: begin the closing after the final reading clock completes.
- Listen: begin only after the real final recording's completion event. Missing/error audio does not count as completion; allow a clear manual Finish path. Narration is currently pending production.
- Pause, hidden tabs and open menus freeze the closing timeline. Reduced motion retains a fixed wide view and uses restrained opacity changes.
- Revisit chapters opens the chapter menu. Selecting a chapter cancels closing state and smoothly returns to story framing. Closing the menu without selecting a chapter returns to the end screen.
- Stay on the field removes the end overlay and enables existing exploration; keep a small, accessible menu action available.
- Begin again resets the passage only when selected and runs the approved opening. Merely reaching the ending does not erase progress or preferences.
- A deep link to the last passage is not evidence of reading all 18 chapters. Avoid an all-chapters-completed claim or achievement counter.
- Preserve the user's sound volume and lighting preference. The ending needs a separate temporary sound envelope, restored when revisiting or restarting.

## Implementation boundaries

A small closing-state module can own the timeline, pause/cancel behavior, camera targets and end-screen state. It connects to the existing reading/audio completion events and the final manual action. Preserve stable passage IDs, source text, approved character geometry, and the current continuous camera rig. Stage the final hand/bow gesture deliberately; do not introduce camera resets or force the chariot to teleport. Localize the new controls and reflection in the same five languages.

Before release, verify manual completion, autoplay, audio completion/missing audio, menu cancellation, restart, hidden-tab resume, reduced motion, and narrow portrait layouts. Check actual character motion and mobile rendering in a separately authorized browser test; source checks alone cannot establish visual quality.
