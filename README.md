# LAGUNA BRAVA

An open-world crime game for gta6-01, built for **@climaxku**. A wild lagoon city of stilt
villages, airboat channels and storm-season smuggling: fifteen story jobs for Mamá Yara
Quintana, a five-star Patrulla Estatal with named dispatch units and a helicopter, shops,
exports, hidden rum jugs, and a hurricane on the horizon.

## Play it

Serve `game/` statically (or run `node serve.ts`) and open `index.html`.
`node main.ts` with `MAKEFUN_OUTPUT_DIR` set produces the hand-in (game + screenshots +
dossier.json).

- **WASD** move / drive · **E** enter, exit, talk, buy · **F / click** shoot · **1–6** weapons
- **M** full map · **P** pause & stats · **N** night · **R** radio · **Shift** run
- `?smoke=1` runs the scripted self-test (job 1 end-to-end, driving, boating, gunfire,
  five stars, shop, save/load) and reports in the page title.
- `?shot=chase|action|map|passed&seed=11` stages the four judged screenshots.

## Layout

`game/src/` — one job per ES module: `world` (the basin), `vehicles`, `airboat`, `peds`,
`police`, `combat`, `missions` (the 15 jobs), `economy` (shops, pickups, saves), `render`
(baked terrain chunks, entities, the grade), `hud`, `minimap`, `menus`, `shots`, `main`.
