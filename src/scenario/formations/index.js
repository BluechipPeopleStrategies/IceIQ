// Formation registry. Each formation is a declarative module whose slot
// geometry is built from parametric constructors (geometry.js) so compiled
// instances are hockey-coherent by construction. Add a formation by importing
// it here.

import oddManRush from "./odd-man-rush.js";
import ozBackdoor from "./oz-backdoor.js";
import nzGap1on1 from "./nz-gap-1on1.js";

export const FORMATIONS = {
  [oddManRush.id]: oddManRush,
  [ozBackdoor.id]: ozBackdoor,
  [nzGap1on1.id]: nzGap1on1,
};
