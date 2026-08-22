# Calculation method

Everything in this document is deterministic and implemented in code. No AI model is ever
involved in these calculations. Sources are cited; deviations and approximations are
disclosed.

## 1. Birthplace and historical time

- The birthplace resolves to a canonical name, latitude, longitude, and IANA time-zone
  identifier (`PlaceSearchProvider`).
- The local birth time is converted to UTC with **moment-timezone** (MIT), which embeds
  the full IANA tz database. The offset that applies is the **historical** offset for that
  exact place and date — LMT, DST transitions, and zone redefinitions included. We never
  use the person's current offset or today's rules.
- Example: Wadowice, Poland, 1920-05-18 17:30 local → **15:30 UTC** (historical +02:00),
  matching the published John Paul II reference chart.

## 2. Ephemeris and reference frames

- **astronomy-engine** v2 (MIT, Don Cross): VSOP87-based geocentric positions of the Sun,
  Moon, and planets, true-of-date ecliptic of date. This library is isolated behind the
  `ChartCalculationProvider` interface so it can be replaced or commercially licensed
  without touching the rest of the application.
- **Tropical zodiac** (equinox-anchored) for the MVP. Displayed on the methodology page.
- **ΔT** (TT−UT1): Espenak–Meeus piecewise polynomials (as used by the NASA Eclipse
  website), valid 1900–2150. Outside that range the nearest segment is used and the
  approximation is disclosed.
- **Obliquity**: IAU 2006 mean obliquity + nutation in obliquity (true obliquity of date).
- **Sidereal time**: apparent Greenwich sidereal time (GMST + equation of the equinoxes);
  local sidereal time = GAST + east longitude.

## 3. Placements

For each of Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto,
North Node (and Ascendant/Midheaven when the time is known):

- Exact ecliptic longitude normalized to [0, 360).
- Zodiac sign, degree/minute/second within the sign.
- Sabian degree (1–30) and global index (1–360) via the documented convention below.
- **North Node**: configurable convention (nodeMode): `true` (default, SE-compatible — implemented as the osculating node, agrees with SE true node within 0.02–1.2°), `mean` (Meeus polynomial, agrees with SE mean node within 0.005°), or `osculating` (custom state-vector computation). See docs/north-node-convention.md. The selected convention is recorded in every chart. Note: this is the osculating (true) node; published charts may
  use the mean node, which differs by up to ~1.5°.

## 4. Ascendant, Midheaven, and houses (time-known only)

- **Ascendant**: the ecliptic longitude rising on the eastern horizon. Found by scanning
  the ecliptic for both altitude-zero crossings and selecting the rising one (hour angle
  in (180°, 360°)), then bisecting. No approximate quadrant formulas.
- **Midheaven**: the ecliptic longitude whose right ascension equals the local sidereal
  time.
- **Houses**: Placidus (the MVP default, isolated in `lib/chart/houses.ts`), following
  the LibEphemeris / Swiss Ephemeris algorithm:
  - SA = 90° + AD (diurnal semi-arc), AD = arcsin(tan φ · tan δ), tan δ = sin(RA)·tan ε;
  - cusp 11: RA = ARMC + SA/3; cusp 12: RA = ARMC + 2·SA/3;
  - cusp 2: RA = ARMC + 180° − 2·(90°−AD)/3; cusp 3: RA = ARMC + 180° − (90°−AD)/3;
  - each cusp solved by fixed-point iteration on right ascension (convergent sequence);
  - cusps 1, 4, 7, 10 are Ascendant, IC, Descendant, MC; 5/6/8/9 are the opposites of
    11/12/2/3.
  - Above the polar circles, where semi-arcs are undefined, an equal-house fallback is
    used and recorded in the chart's house-system description.
  - Verified: the defining equations hold to 1e-4° and the Sun/Moon house placements
    match the Astrotheme Placidus reference (see reference-chart tests).

## 5. Sabian degree convention (explicit, tested, configurable)

A position within a degree corresponds to the **next numbered Sabian degree**:

| Position | Convention | Sabian degree | Global index |
| --- | --- | --- | --- |
| 0°00′00″ Aries | leading edge | Aries 1 | 1 |
| 0°00′01″ Aries | within degree | Aries 1 | 1 |
| 14°32′ Aries | within degree | Aries 15 | 15 |
| 29°59′59″ Aries | within degree | Aries 30 | 30 |
| 29°59′59″ Pisces | within degree | Pisces 30 | 360 |

- The default is the **leading-edge** boundary: an exact 0°00′00″ of a sign maps to that
  sign's degree 1. The alternative **trailing-edge** convention (0°00′00″ → previous
  sign's degree 30) is implemented for comparison and tests.
- The UI always shows the exact position **and** the resulting Sabian degree together.

## 6. Unknown birth time

- The Ascendant, Midheaven, and houses are **not calculated and never displayed** as facts.
- Date-anchored placements (Sun, planets, Moon) are computed from a **disclosed reference
  instant**: solar midnight of the local calendar date, converted with the historical
  offset. This is never presented as the birth time.
- The Moon is marked **potentially uncertain** when it changes sign or Sabian degree
  during the local calendar day — scanned over the ACTUAL local day at the birthplace
  (converted to UTC bounds), independent of the server machine's timezone.
- The reading is reduced accordingly, and the Ascendant gate becomes a respectful
  explanation.

## 6a. Birth-time integrity (DST gaps and overlaps)

- **Calendar dates** are strictly validated (Feb 30, Apr 31, etc. are rejected as HTTP
  400) via a UTC round-trip that never depends on the server's local zone.
- **DST spring-forward gaps**: a wall-clock time that never existed (e.g. 2024-03-10
  02:30 in America/New_York) is detected and rejected — never silently shifted.
- **DST fall-back overlaps**: a wall-clock time that occurred twice (e.g. 2024-11-03
  01:30 in America/New_York) is detected; both candidate instants are exposed, the
  daylight-saving occurrence is used by default with the choice disclosed, and an
  explicit standard-time override is supported.
- `timeKnown=true` requires a `birthTime`; `timeKnown=false` forbids one. A silent
  midnight substitution for a supposedly known time is impossible by construction.

## 7. Validation

The chart provider is validated against published reference charts:

- **John Paul II** (Wadowice, 1920-05-18, 17:30 local): Sun Taurus 27°22′, Moon Gemini
  2°41′, Mercury Taurus 18°33′, Venus Taurus 14°51′, Mars Libra 22°26′, Jupiter Leo 11°00′,
  Saturn Virgo 4°56′, Uranus Pisces 5°28′, Neptune Leo 8°59′, Pluto Cancer 6°19′, North
  Node Scorpio ~15°38′ (osculating), Ascendant Libra 27°16′, MC Leo 5°38′ — matches the
  published chart within arcminutes for the planets/angles; the North Node is compared
  within a documented osculating-vs-mean tolerance and is never the descending node.
- House placements (Sun/Moon in House 8 per Astrotheme Placidus) and the numerical
  Placidus cusp equations are asserted in the reference-chart tests.

Unit tests cover: 0°00′00″, 0°00′01″, normal fractional positions, 29°59′59″ of every
sign, the Aries↔Pisces global boundary, DST gap/overlap and historical time-zone cases,
calendar-date integrity, and unknown-time behavior.
