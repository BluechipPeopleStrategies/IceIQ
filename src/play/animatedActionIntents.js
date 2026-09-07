// Explicit presentation bindings to existing choices. A tap never creates a new
// answer/route, and empty ice must not silently become "deke into the defender".
const BACKDOOR = ['play_2v1_backdoor_read_u11_v1', 'play_2v1_backdoor_read_backchecker_u11_v1', 'play_2v1_backdoor_read_support_flat_u11_v1', 'play_2v1_backdoor_read_late_goalie_slide_u13_v1', 'play_2v1_backdoor_read_u11_v1_mirror'];
const BINDINGS = Object.freeze({
  ...Object.fromEntries(BACKDOOR.map(id => [id, { nodeId: 'rush', carrier: 'F1', receiver: 'F2', pass: 'pass_backdoor', shot: 'shoot_far' }])),
  play_2v1_defender_holds_middle_u11_v1: { nodeId: 'rush', carrier: 'F1', receiver: 'F2', pass: 'force_pass', shot: 'shoot_lane' },
  play_2v1_pass_lane_removed_u11_v1: { nodeId: 'rush', carrier: 'F1', receiver: 'F2', pass: 'force_pass', shot: 'attack_shot_lane' },
  play_2v1_support_too_flat_u11_v1: { nodeId: 'rush', carrier: 'F1', receiver: 'F2', pass: 'force_flat_pass', shot: 'attack_lane' },
  play_2v1_goalie_late_after_pass_u11_v1: { nodeId: 'catch', carrier: 'F2', receiver: 'F1', pass: 'pass_back', shot: 'quick_shot' },
});

export function animatedActionIntents(play, node) {
  const binding = BINDINGS[play.id];
  if (!binding || node.id !== binding.nodeId || node.decisionActor !== binding.carrier || node.terminal || node.autoNext) return [];
  const carrier = play.actors.find(actor => actor.id === binding.carrier), receiver = play.actors.find(actor => actor.id === binding.receiver);
  const pass = node.ask?.opts?.find(option => option.id === binding.pass), shot = node.ask?.opts?.find(option => option.id === binding.shot);
  if (!carrier || !receiver || carrier.team !== receiver.team || !pass || !shot) return [];
  return [
    { kind: 'pass', actorId: receiver.id, option: pass },
    { kind: 'shoot', goalSide: 'right', option: shot },
  ];
}
