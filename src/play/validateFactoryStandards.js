export function validateFactoryStandards(play) {
  const errs = [];
  const warns = [];

  const youngAges = new Set(["U7", "U9"]);
  const tacticalShorthand = /\b(?:A|D|F|BC)\d+\b/;
  const youngPlay = (play.ageBands || []).some((age) => youngAges.has(age));
  const startNodeId = play.start || Object.keys(play.nodes || {})[0];

  if (!play?.id) errs.push({ playId: play?.id || "unknown", nodeId: "", message: "play missing id" });
  if (!play?.sourceRef?.note || !play?.sourceRef?.cite) {
    errs.push({ playId: play?.id || "unknown", nodeId: "", message: "play must include sourceRef.note and sourceRef.cite" });
  }

  for (const [nodeId, node] of Object.entries(play.nodes || {})) {
    // Second Question Must Show New Read Rule:
    // A follow-up question after the first read must show a new cue and explicitly opt into re-read logic.
    // Otherwise, it should be an outcome/reveal node instead of another quiz question.
    if (node.terminal) continue;
    if (node.autoNext) continue; // watch nodes carry no question; chain shape is validated in validateAnimatedPlay

    const opts = node.ask?.opts || [];
    if (!node.ask) errs.push({ playId: play.id, nodeId, message: "non-terminal node missing ask" });
    if (opts.filter((opt) => opt.ok).length !== 1) {
      errs.push({ playId: play.id, nodeId, message: "non-terminal node must have exactly one correct answer" });
    }

    if (
      nodeId !== startNodeId &&
      node.ask &&
      !node.terminal &&
      !node.reRead
    ) {
      warns.push({
        playId: play.id,
        nodeId,
        message: "follow-up question must include reRead: true or become a terminal reveal node"
      });
    }

    if (
      nodeId !== startNodeId &&
      node.ask &&
      !node.terminal &&
      node.reRead &&
      !node.cue &&
      !node.showCueOnQuestion
    ) {
      errs.push({
        playId: play.id,
        nodeId,
        message: "follow-up reRead question must show a new visible cue"
      });
    }

    if (node.ask?.choiceMode === "lane-pick") {
      if ((node.overlays || []).some((overlay) => overlay.kind === "freeze")) {
        warns.push({ playId: play.id, nodeId, message: "route-choice node should not place a freeze marker on the answer destination" });
      }
      for (const opt of opts) {
        if (!Array.isArray(opt.zone)) {
          warns.push({ playId: play.id, nodeId, message: "route-choice option should include zone coordinates" });
        }
      }
    }

    for (const opt of opts) {
      if (!opt.id) errs.push({ playId: play.id, nodeId, message: "option missing id" });
      if (!opt.t) errs.push({ playId: play.id, nodeId, message: "option missing text" });

      if (youngPlay && tacticalShorthand.test(opt.t || "") && !opt.youngT) {
        errs.push({ playId: play.id, nodeId, message: "young-player option uses tactical shorthand without youngT" });
      }

      if (youngPlay && opt.youngT && tacticalShorthand.test(opt.youngT)) {
        errs.push({ playId: play.id, nodeId, message: "youngT still uses tactical shorthand" });
      }

      if (!opt.ok && !opt.no) {
        warns.push({ playId: play.id, nodeId, message: "wrong answer should include teaching note" });
      }
    }
  }

  return { ok: errs.length === 0, errs, warns };
}

export function validatePlayCatalogFactoryStandards(plays) {
  const results = plays.map((play) => ({
    playId: play.id,
    title: play.title,
    ...validateFactoryStandards(play),
  }));

  return {
    ok: results.every((result) => result.ok),
    results,
    errs: results.flatMap((result) => result.errs),
    warns: results.flatMap((result) => result.warns),
  };
}
