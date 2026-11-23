# LAGUNA BRAVA

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Climaxcuy/laguna-brava/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Climaxcuy/laguna-brava/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

LAGUNA BRAVA is an original open-world crime game built for the Make GTA 6 bounty on make.fun. You roam a sun-soaked lagoon city across a 15-mission campaign: steal airboats, run contraband between six districts, fight it out on the water in airboat combat, and outrun a 5-star wanted system while live dispatch calls your position over the radio. Every job, arrest and escape lands in your season ledger, and the full chart map tracks the districts you have unlocked.

Bounty page: https://make.fun/bounty/gta6-01

## Play

Run `node serve.ts`, then open http://localhost:8080 in a desktop browser. The game is plain static files under `game/` — no build step, no network requests — and plays with keyboard and mouse.

## Hand-in

Run `node main.ts`: it copies `game/` and `screenshots/` into the output directory and writes `dossier.json` there, built with `buildDossier` from `vendor/makefun-game.ts`. As it finishes it prints a one-line summary of what was handed in.

## Join

Enter the bounty yourself on make.fun — sign up with my referral link: https://make.fun/r/7yhgcayy

## License

MIT — see LICENSE.
