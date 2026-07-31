// Remotion's bundler requires the entry point it's given to be the file that
// calls registerRoot() -- Root.jsx (registration target) and
// CoachPlayComposition.jsx (the actual render logic) stay split per the
// brief, but registerRoot() itself needs its own file per @remotion/bundler's
// validateEntryPoint check (verified against the installed
// @remotion/bundler@4.0.489 during Task 8's dry-run: passing Root.jsx
// directly as entryPoint throws "this file does not contain registerRoot").
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root.jsx";

registerRoot(RemotionRoot);
