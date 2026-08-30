# North Node Convention — Decision Report

## The problem

The application previously computed the North Node as the **osculating
ascending node** from the Moon's state vectors. Published charts and consumer
astrology software label the node differently (mean vs true), and the choice
can change the displayed Sabian Symbol. This report quantifies the
differences against the Swiss Ephemeris and documents the resolution.

## Conventions compared

| Convention | Definition | Used by |
| --- | --- | --- |
| **Mean node** | Smooth polynomial (Meeus ch. 47 / SE mean node): Ω = 125.04452 − 1934.136261·T + 0.0020708·T² + T³/450000 | Many published charts that simply label "Node"; classical astrology |
| **True node** | The actual intersection of the Moon's orbit with the ecliptic at the instant | Astro.com "True Node", Swiss Ephemeris `SE_TRUE_NODE`, most modern software |
| **Osculating node** (custom) | Node of the Moon's osculating orbit from position + velocity state vectors | This application (previous default) |

## Measured differences (14 gold-master charts, Swiss Ephemeris 2.10.03)

| | vs SE mean node | vs SE true node |
| --- | --- | --- |
| Longitude difference range | 0.70° – 1.80° | 0.02° – 1.20° |
| Charts where the Sabian degree changes | **13 / 14** | **4 / 14** (all boundary cases) |

The custom osculating node is much closer to the SE **true** node than the
mean node — typically within 0.02–0.38°, occasionally up to 1.2° near
boundaries. Choosing the mean node would change the displayed Sabian Symbol
in almost every chart; choosing the true node changes it in only ~29% of
charts (and only when the node sits within ~1° of a degree boundary).

## Resolution

A `nodeMode` setting exists on the chart provider (`ChartInput.nodeMode`):

- `osculating` — **default**. The instantaneous ascending node computed from the
  Moon's position + velocity state vectors. This is an **approximation, not the
  Swiss Ephemeris `SE_TRUE_NODE`**: it agrees with the SE true node to within
  0.02–1.2° (occasionally up to ~1.5°), and that difference changes the displayed
  Sabian degree in **4 of the 14** gold-master fixtures. It is deliberately NOT
  labeled "True Node" — the label shown to users is "Osculating ascending node
  (default) — … an approximation, not the Swiss Ephemeris 'true node'".
- `mean` — SE mean node via the Meeus polynomial (agreement ≤ 0.05°, verified
  against SE in the gold-master tests). This is the convention that most closely
  matches a genuine, independently reproducible reference today.

The previous `true` mode was **removed**: it ran the same osculating computation
but was labeled "True node (Swiss-Ephemeris-compatible)", which overstated its
accuracy. A genuine true node requires the licensed Swiss Ephemeris
(`swe_calc_ut(SE_TRUE_NODE)`) and is not offered until that is connected and
independently verified.

The selected convention is recorded in every chart's
`ephemerisConfig.northNodeConvention` and displayed in the reading page's
Calculation Details, so a user can always see exactly which algorithm produced
the displayed node. The gold-master suite asserts that each displayed convention
name matches the algorithm actually executed.

## Recommendation for the beta

Default to **`osculating`** (instantaneous, matching the exact birth moment) with
the honest approximation disclosure above. Offer **`mean`** for users who follow
the classical/mean-node tradition and want the convention that most closely
matches the published reference. Do not advertise either as the Swiss Ephemeris
"true node" until the licensed ephemeris is connected and the true node is
computed from it directly.
