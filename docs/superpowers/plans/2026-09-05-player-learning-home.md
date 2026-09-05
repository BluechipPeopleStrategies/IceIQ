# Player home — six worlds and recorded practice

Owner direction, September 5: replace the Player DEMO home's duplicate activity journey / Skill Path presentation with the current six-world learning model, using consistent navy and gold glass surfaces.

## Bounded implementation

1. Add `src/player/PlayerLearningHome.jsx`, its scoped stylesheet, and a small tested presentation/data helper. The root task integrates the component in `App.jsx`; existing profile, subscription gates, training, goals and historical records retain their owners.
2. Project all six canonical domains through `getLearningWorlds()` and the preserved `worlds-v1.png` sprite sheet. Counts describe the selected age's curriculum focuses, never completed lessons. Selecting a world reveals real mission names and opens that world in Learn the game.
3. Provide six consistent actions: Learn, Practice, Experimental scenarios, Goals, Training and Progress. Keep additional play / Brain Gym / quiz access and clearly labelled activity history secondary. All controls have at least a 44px touch target.
4. Read the current eligible question catalog and the active player's spaced-practice ledger through the existing mastery API. Show groups practised and groups meeting its practice requirements, with the age and evidence boundary visible. Do not calculate a new rank, invent a review schedule, migrate old attempts, or award credit for experimental answers.
5. Verify canonical age coverage, real navigation, late asynchronous results after profile/age changes, read-only storage, and unavailable versus empty progress. Root checks the actual integrated home at 390px and 1440px.

## Integration contract

`PlayerLearningHome` accepts `player`, optional controlled `ageBand` and `onAgeChange`, `onNavigate`, optional `trainingSessionCount`, and optional preloaded `masteryState`. Without a preloaded state it loads its own read-only, player/age-scoped summary. The default age is the active player's level.

Navigation emits `{id, ageBand, worldId?}`. Main IDs: `learn`, `practice`, `experimental`, `goals`, `training`, `progress`. Secondary IDs: `history`, `brain`, `play`, `quiz`, `profile`. `learn` can carry `worldId`. The App adapter owns actual routes and all access checks. World deep links use `?arena=worlds&age=U13&world=defensive-play`; unknown query values are ignored.

Replace the inline `JourneyBody`, Skill Path IIFE and duplicate quick-action blocks in Home with this component. Place it before secondary widgets so the home leads with learning. The containing Home column should allow about 1120px on desktop; this component also adapts to narrow containers. The legacy `journey` page remains the activity-history destination.

No historical journey, mastery, quiz or training records are written or deleted by the home component. The preserved art file is not modified. Structural tests do not establish hockey mastery or on-ice transfer.


Implementation refinement: the recorded-practice card has a direct `library` action. Home actions use an in-session `player-learning` screen and pass `initialSearch` to PracticeHub, rather than reloading into the public review URL. This preserves hosted player identity while keeping shareable public review records separate. The hub exposes Back to Home. Spaced evidence is stored by the library through the guarded storage helper; the Home remains read-only. See the September 5 verification note for the exact checks and local preview.
