# Coach skating routes

Standing scope: Thomas wants to place/freeze players and plan their movement for source-bound hockey questions, on phone and desktop. This slice extends the existing Coach Lab director; it does not change quiz scoring or the scenario factory.

1. Compose a separate pending route from the exact paused pose using ordinary director-v1 position keys. Preserve earlier motion, other actors, provenance and puck ownership. Apply explicitly replaces the selected actor's remaining keys and holds the finish. Frozen players must be unfrozen first. Test timing, geometry, immutability and replay.
2. Accept completed taps in either 3D camera or a full-rink SVG board, with numeric coordinates as a keyboard alternative. Discard scrolls, cancelled gestures and secondary pointers. Show the same pending points in all views.
3. Integrate a captured, paused editing session. Lock other authoring controls until Apply/Cancel; support undo/clear of pending points, timing/facing controls, manual and animated preview, and one-step undo after Apply. Later draft edits invalidate that undo.
4. Verify complete phone and desktop flows, export/save/reopen, cancellation, actual touch mapping, reduced motion and existing director behavior. Review independently, run practice regressions and build, update the source/interaction map and roadmap, then commit/push the scoped change and verify deployment.

Bounds: straight position interpolation, no skating-physics validation, no AI grade, no pass-transfer authoring. The carrier's puck follows existing director behavior. Animate play follows authored keys; Play this setup uses the separate live prototype from time zero.
