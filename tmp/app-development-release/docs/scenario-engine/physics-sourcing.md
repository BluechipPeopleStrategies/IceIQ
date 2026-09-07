# Physics parameter sourcing — Level-1 simulator

**Status:** the record Phase 1's Judgment Call 1 and Phase 2 Task 1 require:
"Every physics constant in the profile file cites a real source or carries
an explicit 'engineering estimate, pending source' marker" — never silently
invented. Research: three parallel public-source passes (2026-07-30),
citations verified live, no login-gated scraping.

## What's actually out there

**No dataset covers a clean U7/U9/U11/U13/U15/U18 ladder.** Published youth
ice-hockey on-ice kinematic studies exist, but they sample specific ages or
developmental stages (Pre-/Mid-/Post-PHV — peak-height-velocity, a
biological-maturity marker, not a calendar age), not this catalog's exact
band boundaries. USA Hockey's ADM and Hockey Canada's LTPD — the two bodies
that actually define these age bands — publish qualitative developmental
frameworks, not quantitative speed/acceleration benchmarks (confirmed by
direct review of both official sites). Every number below is either a real
measurement mapped onto the nearest band, or an explicitly labeled estimate
extrapolated from the measurements that do exist.

**Nothing published gives turning radius or stopping distance in metres, at
any age.** Every skater-kinematics study found measures straight-line sprint
speed/acceleration and agility-course *time* (seconds through a fixed
course), never a radius or braking distance in physical units. Both
parameters in every profile below are engineering estimates.

**No youth ice-hockey pass-velocity study exists.** Puck-speed literature is
adult/pro/high-school shot-velocity data. A 2023 youth (18yo) shooting-speed
study is real but measures *rink hockey* (roller skates + ball) — a
different sport — and is excluded rather than mislabeled as ice hockey data.

## Skater kinematics — sources

| Age/stage (source's own bracket) | On-ice max speed | 0-10m accel | Source |
|---|---|---|---|
| 9-11yo (n=11, combine) | 7.60±0.32 m/s (27.4 km/h) | 1.53±0.19s (6.1m split) | Frontiers in Sports & Active Living, 2024 — [PMC11358090](https://pmc.ncbi.nlm.nih.gov/articles/PMC11358090/) |
| ~12.8yo, Pre-PHV | 8.60±0.37 m/s (31 km/h) | 2.20±0.09s | J. Functional Morphology & Kinesiology, 2025 — [PMC12821503](https://pmc.ncbi.nlm.nih.gov/articles/PMC12821503/) |
| ~14.0yo, Mid-PHV | 9.20±0.61 m/s (33 km/h) | 2.11±0.16s | same, PMC12821503 |
| ~16.0yo, Post-PHV | 10.32±0.48 m/s (37 km/h) | 1.84±0.11s | same, PMC12821503 |
| ~13.8/14.8yo (M/F) | 9.83 / 9.08 m/s | — | European Journal of Sport Science, 2024 — [PMC11451559](https://pmc.ncbi.nlm.nih.gov/articles/PMC11451559/) |
| 15.2-15.4yo, elite/sub-elite | — | 0.868s / 0.914s (0-4m) | [PMC11307188](https://pmc.ncbi.nlm.nih.gov/articles/PMC11307188/) |
| Pooled 11-37yo, NOT youth-isolated (reference only) | 8.1 m/s | peak 5.89 m/s² | Biology of Sport meta-analysis, 2023, n=2,652 — [PMC10286618](https://pmc.ncbi.nlm.nih.gov/articles/PMC10286618/) |

ADM/LTPD (qualitative, no benchmarks): [usahockey.com/ageclassifications](https://www.usahockey.com/ageclassifications), [hockeycanada.ca LTPD](https://www.hockeycanada.ca/en-ca/hockey-programs/coaching/ltpd/ltpd-players)

## Puck physics — sources

- Adult/pro game-play puck speed: 70-110 mph typical, up to 90 mph
  (high-school) / 120 mph (college/pro) in Sim & Chao's 1978 biomechanics
  study, cited in Anderson & Smith, *Experimental Characterization of Ice
  Hockey Sticks and Pucks*, Washington State Univ. —
  [PDF](https://ssl.wsu.edu/documents/2015/10/experimental-characterization-of-ice-hockey-sticks-and-pucks.pdf/)
- NHL upper-bound reference: 106 mph (Tage Thompson, tracked) —
  [UAF News](https://www.uaf.edu/news/the-physics-of-skating-and-slap-shots.php)
- Puck-on-ice sliding friction coefficient: ~0.1 (Alain Haché) — real
  physical constant, age-independent — [Physics World](https://physicsworld.com/a/physics-on-ice/).
  Air resistance, not ice friction, dominates real deceleration at speed (a
  170g puck at 160 km/h: ~1,000m on friction alone, ~227m with air drag).
- Puck coefficient of restitution (bounce off stick/boards): 0.45-0.55 at
  room temp, 0.12-0.27 frozen — same WSU paper as above.
- No youth ice-hockey pass-velocity study found; the closest youth data
  (MDPI *Biomechanics* 2023, 18yo, 85-110 km/h shots) is rink hockey, a
  different sport, and is excluded rather than reused across sports.

## Reaction time — sources

- No published ice-hockey-specific youth reaction-time dataset exists.
- Adult field hockey players (n=45, mean 21.4y): visual RT 224-225ms —
  [kheljournal.com](https://www.kheljournal.com/archives/2020/vol7issue1/PartB/8-1-80-543.pdf).
  Same paper's secondhand, unverified citation of ice hockey pros/amateurs
  at ~175-177ms is noted but not used as a sourced number here.
- Adult non-hockey athletes (n=9, mean 25.2y): full response RT 242-248ms,
  decomposed into a ~130-134ms perceptual-motor component and a further
  ~130-140ms choice/decision component under a spatially complex task —
  [PMC11207928](https://pmc.ncbi.nlm.nih.gov/articles/PMC11207928/). This is
  the basis for splitting the sim's reaction delay into a base component
  plus a choice-task addition, rather than one flat number.
- Youth non-hockey (elite youth soccer, n=78, mean 9.54y): visual RT is
  trainable (11.55% improvement, p<0.001) but raw baseline ms wasn't
  published in an accessible table — confirms youth VRT is a real,
  measurable, age-relevant quantity without giving this project a number to
  cite — [PMC6949993](https://pmc.ncbi.nlm.nih.gov/articles/PMC6949993/).
- Age trend (general population, n=7,417): RT is fastest in the 20s and
  slows by decade afterward, implying under-18 youths sit at or slightly
  above young-adult baseline — not faster — [Der & Deary 2006](https://www.research.ed.ac.uk/en/publications/reaction-time-age-and-cognitive-ability-longitudinal-findings-fro/).

## What the profiles below actually use

**Skating (top speed, 0-10m acceleration time):** real measurements, mapped
to the nearest age band per the table above. U13→Pre-PHV, U15→Mid-PHV
(averaged with the 13.8/14.8yo study), U18→Post-PHV. **U11** uses the 9-11yo
combine study directly. **U9 and U7 have zero published data** — both are
linear extrapolations continuing the growth rate visible across the four
real U11-U18 data points: computing the year-over-year rate across each
consecutive real pair (U11→U13: 0.357 m/s/yr, U13→U15: 0.606 m/s/yr,
U15→U18: 0.496 m/s/yr) and averaging those three segment rates gives
**0.4865 m/s per year of age**, the exact figure the extrapolation code
uses — not the rounder "~0.45" an earlier draft of this doc stated, which
didn't match the code and was corrected after adversarial review
(2026-07-30) caught the mismatch. Both U9 and U7 remain explicitly marked
`"source": "engineering-estimate-pending-source"` in the profile JSON, not
presented as measured.

**Turning radius, stopping distance (all bands):** no published figure
exists anywhere. Estimated kinematically from each band's own real (or
estimated) top speed and acceleration — assuming comparable deceleration
capability to acceleration capability, a standard simplifying assumption
absent direct braking data — and marked
`"source": "engineering-estimate-pending-source"` in every band, including
the ones with real speed/accel data, since the radius/distance figures
themselves are never measured.

**Reaction delay (all bands):** 250-350ms total (≈130-140ms perceptual-motor
+ ≈120-210ms choice-task component, scaled by band), built from the adult
non-hockey proxy data above per its own recommended range, applied uniformly
across youth bands per the "no age-hockey data" and "under-18 not faster
than young-adult" findings — marked
`"source": "engineering-estimate-pending-source-general-athlete-proxy"` to
distinguish it from the fully-invented case: this has real proxy data behind
it, just not hockey- or youth-specific data.

**Puck speed (pass velocity, all bands):** derived as a conservative
fraction of the cited adult/HS shot-velocity range (which is itself an
upper bound, not a pass-velocity number — passes are gentler than shots),
scaled down further for youth strength — marked
`"source": "engineering-estimate-pending-source"`. Puck-ice friction
coefficient (0.1) is used directly as a real, age-independent physical
constant, cited above.

## What would improve this

A real on-ice youth pass-velocity study (none found), any published
turning-radius or stopping-distance figure at any age (none found), any
hockey-specific youth reaction-time study (none found), and direct U7/U9
on-ice kinematic data (none found — youngest published sample starts at
age 9) would each let a marker in the profile move from
`engineering-estimate-pending-source` to a real citation. Flagged here so a
future pass knows exactly what's still owed, not silently treated as solved.
