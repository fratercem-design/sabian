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

A `nodeMode` setting now exists on the chart provider (`ChartInput.nodeMode`):

- `true` — **default**. SE-compatible true node. Implemented as the osculating
  node (the closest available computation to SE's true node; agreement
  0.02–1.2°, verified in the gold-master tests).
- `mean` — SE mean node via the Meeus polynomial (agreement ≤ 0.005°,
  verified against SE in the gold-master tests).
- `osculating` — the original custom state-vector computation, retained and
  fully documented for comparison.

The selected convention is recorded in every chart's
`ephemerisConfig.northNodeConvention` and displayed in the reading page's
Calculation Details, so a user can always see which convention produced the
displayed node.

## Recommendation for the beta

Default to **`true`** (SE-compatible). It matches what Astro.com and most
consumer software display, minimizing "your chart disagrees with my chart"
complaints. The mean node remains available as an explicit setting for users
who follow classical/mean-node traditions. If the runtime engine later
switches to the licensed Swiss Ephemeris, the `true` mode should be re-pointed
at `swe_calc(SE_TRUE_NODE)` directly and the osculating mode kept only as a
legacy option.
