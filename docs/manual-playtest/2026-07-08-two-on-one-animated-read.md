# Manual Playtest: 2-on-1 Animated Read

**Route:** `/#playtest`
**Play:** `play_2v1_backdoor_read_u11_v1`
**Gate:** A new animated play template does not enter the main quiz flow until this checklist passes on desktop and mobile.

## Setup

1. Run `npm run dev`.
2. Open the local Vite URL.
3. Navigate to `/#playtest`.
4. Test U7, U11, and U18 from the age selector.

## Desktop Checklist

- [ ] The defender motion is visible before the first freeze.
- [ ] The decision actor is clearly marked `YOU`.
- [ ] The puck is visible and does not hide the `YOU` marker.
- [ ] The pass, shot, and blocked lane patterns are distinguishable without relying on color.
- [ ] The wrong answer explanations appear after the wrong choice.
- [ ] The correct choice advances to the next read.
- [ ] The terminal goal state appears after the second correct read.
- [ ] Replay returns to the first node.
- [ ] The unclear-read button logs an event without moving the play.

## Mobile Checklist

- [ ] All answer buttons fit without horizontal scrolling.
- [ ] Tokens are readable at phone width.
- [ ] The rink does not clip the open support player or goalie.
- [ ] The replay button is easy to tap.
- [ ] The telemetry summary still updates after choices.

## Pass Standard

The prototype passes this gate only when every checked item above passes. Any failed item gets a short note here and is fixed before the play enters the main session flow.

