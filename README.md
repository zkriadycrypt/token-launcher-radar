# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/zkriadycrypt/token-launcher-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/zkriadycrypt/token-launcher-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar for the [make.fun](https://make.fun/bounty/token-radar-01) bounty `token-radar-01`. It reads a sealed
DefiLlama protocol snapshot, ranks the protocols that record no token by an implied
launch value, and hands in a static dashboard a reader can use to pick what to farm
next — with a concrete farm plan for every protocol on the board.

## What it does

`main.ts` (Node 22, standard library only) reads `input/snapshot.json`, builds the
board with the model in `lib/model.ts`, and writes `board.json`, `data.js`,
`dashboard/`, `screenshots/` and `dossier.json` into the output directory.

### The value model

Implied value follows only from the snapshot's own figures — no hardcoded names:

```
implied = TVL × category multiple × growth × maturity
```

- **Category multiple** — the median market-cap-to-TVL of the protocols in the same
  category that already trade, computed from this snapshot. A category with fewer
  than three trading protocols falls back to the overall median; the multiple is
  clamped to 0.05–2.0.
- **Growth** — the 7-day TVL change, clamped to −60%…+120%, weighted at 0.5.
- **Maturity** — 0.6 plus up to 0.4 for up to three years listed with no token recorded.

The board covers every protocol on the snapshot's watchlist, plus the pre-token
protocols below the watchlist floor that pass the watchlist's own exclusion rule
(not a wrapped, staked or bridged product, not an exchange, not a versioned pool).
Protocols that record a token are kept apart in the dashboard's Live tokens list
and are never ranked. Every row says the protocol "records no token" — the record
is not proof a token does not exist.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

The program is deterministic: it reads only the snapshot, uses no clock and no
randomness, so two runs write identical bytes. It exits non-zero if the board
fails the gate's own checks (coverage, ranks, order, farm steps) or if fewer
than three screenshots are present.

## Layout

- `main.ts` — entrypoint: reads the snapshot, writes the board, the dashboard data,
  and the dossier.
- `lib/model.ts` — the value model, the board builder, the farm plans, and the
  snapshot parser.
- `vendor/makefun-board.ts` — the make.fun dossier library, as shipped in the kit.
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js`. It renders with
  no network; all data is inline in `data.js`. Sort the board by column, filter by
  text, category, chain, minimum TVL or watchlist, and click a row for the detail
  view with the implied-value breakdown and the farm plan.
- `screenshots/` — the board, a protocol detail view, and a filtered view.

## License

MIT. See `LICENSE`.
