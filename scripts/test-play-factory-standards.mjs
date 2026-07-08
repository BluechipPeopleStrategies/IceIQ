import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ALL_ANIMATED_PLAYS } from "../src/play/playCatalog.js";
import { validateFactoryStandards, validatePlayCatalogFactoryStandards } from "../src/play/validateFactoryStandards.js";

describe("RinkReads play factory standards", () => {
  it("keeps every catalog play factory-valid", () => {
    const result = validatePlayCatalogFactoryStandards(ALL_ANIMATED_PLAYS);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
  });

  it("rejects young-player tactical shorthand without youngT", () => {
    const badPlay = {
      id: "bad_young_language",
      type: "animated-play",
      title: "Bad young language",
      ageBands: ["U7"],
      sourceRef: { note: "docs/library/test.md", cite: "test" },
      actors: [],
      nodes: {
        start: {
          id: "start",
          q: "What should you do?",
          pos: {},
          ask: {
            opts: [
              { id: "a", t: "Pass to F2", ok: true, next: "finish" },
              { id: "b", t: "Shoot", no: "No.", next: "finish" }
            ]
          }
        },
        finish: { id: "finish", terminal: true, q: "Done", pos: {} }
      }
    };

    const result = validateFactoryStandards(badPlay);
    assert.equal(result.ok, false);
  });

  it("allows young-player text when youngT translates shorthand", () => {
    const goodPlay = {
      id: "good_young_language",
      type: "animated-play",
      title: "Good young language",
      ageBands: ["U7"],
      sourceRef: { note: "docs/library/test.md", cite: "test" },
      actors: [],
      nodes: {
        start: {
          id: "start",
          q: "What should you do?",
          pos: {},
          ask: {
            opts: [
              { id: "a", t: "Pass to F2", youngT: "Pass to your teammate", ok: true, next: "finish" },
              { id: "b", t: "Shoot", no: "No.", next: "finish" }
            ]
          }
        },
        finish: { id: "finish", terminal: true, q: "Done", pos: {} }
      }
    };

    const result = validateFactoryStandards(goodPlay);
    assert.deepEqual(result.errs, []);
    assert.equal(result.ok, true);
  });
});
