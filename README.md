# Strait Outta Hormuz

An arcade browser game on a nautical chart of the Strait of Hormuz. You drive an oil tanker:
load crude at oil fields inside the Gulf, sail out through the Strait, and sell to India, China,
Japan or Europe — while dodging sea mines, speedboat boarding parties, drones, cruise missiles,
ballistic strikes and torpedoes.

No frameworks, no assets: one HTML page with canvas rendering and WebAudio-synthesized sound.

## Play
- Live version: published as a claude.ai Artifact.
- Locally: run `./build.sh`, then open `dist/index.html` in a browser.

## Hormuz Dash
A separate, simpler take on the game in `dash/hormuz-dash.html` (one self-contained page).

- The whole Persian Gulf, from Basra and Kuwait to the Arabian Sea, on a scrolling satellite-style chart with a minimap.
- **W** speeds up; let go and the tanker drifts to a stop. **S** brakes, and holding S once stopped backs up. **A** / **D** turn (arrow keys work too). On a phone, drag up, down or sideways.
- A game lasts five minutes (or until all three tankers are sunk); Iran fires more often as the clock runs down.
- Load by slowing down inside a terminal ring: Al Basrah (Iraq), Mina al-Ahmadi (Kuwait), Ras Tanura (Saudi Arabia) for crude; Ras Laffan (Qatar) and Das Island (UAE) for LNG. The farther from the Strait, the better the pay. A terminal closes after you load there and reopens once you have loaded at all the others.
- Sell by crossing the green line at 57.4°E, just past the Strait in the Gulf of Oman. Each sale repairs 30% of the hull.
- Iran launches from real coastal and inland sites: ballistic missiles (a red circle marks the impact, leave it at once), cruise missiles (aimed at where you are heading; turn or change speed and they lose you) and drones (slower than you; one blinks red for a moment, then dives at where you are heading, so turn as it dives). Only one cruise missile flies at a time; ballistic missiles land in under four seconds and lead you. Three tankers per game.
- **Space** (or the FIRE button on a phone) fires the tanker's gun at the nearest drone or cruise missile within range: about 90% against drones, 60% against cruise missiles, no effect on ballistic missiles. Each tanker starts with 8 bursts; every sale adds 5, up to 12. Drones come more often and in groups of up to three.

Build with `./build.sh` (writes `dist/dash.html` for local play) and test with `node tools/dash-test.js "$PWD"`.

## Controls
| Action | Keyboard / mouse | Phone |
| --- | --- | --- |
| Steer | WASD or arrows, or hold the left mouse button | Drag anywhere |
| Flares | Space or right-click | FLARE button |
| Honk | H | HONK button |
| Pause | P or Esc | II button |
| Mute | M | SND button |

## Developer settings
The title screen has a **Developer settings** link (or press the backquote key `` ` `` on the title screen).
It lists every optional feature with a switch. All features are on by default; switches are saved in
the browser (`localStorage`) and apply from the next level you start.

| Feature | Switch id | What it adds |
| --- | --- | --- |
| Special orders and rubber ducks | `events` | Absurd buyer requests (one barrel, not a scratch, speed run, serenade, smoky flavour) and duckling convoys that cost money when hit |
| Ship skins | `skins` | Badge-unlocked tankers (Barbie Crude, Dazzle Camo, Jolly Roger, Pool Flamingo, Captain Quack, Big Tuna, Midas Touch) with a picker on the title screen |
| Absurd enemies | `absurd` | Seagull swarms that block the view and splat the deck (honk to scatter), the USS Very Lost going the wrong way with flyby jets, inflatable decoy tankers that missiles and drones chase |
| Close-call replay | `replay` | The best near miss of a level replays in slow motion on the results screen with a sports-commentator line |
| Daily Strait | `daily` | One 90-second score attack per day with a daily twist (night, fog, mine buffet, drone wedding, ...), the same course for everyone, a rental tanker, best score, day streak and a career cash reward |
| Missions | `missions` | Three seeded optional goals per level (honk, deliver to a country, combos, no flares, hull above 70%, ...) with cash rewards, a HUD tracker and results summary |
| Captain Legend meter | `legend` | Stylish play fills a meter; when full, 10 seconds of double pay, a heavy-metal riff, a golden aura and flame wake |
| Perk picks | `perks` | After each win, pick 1 of 3 silly perks for the next level (Shockwave Horn, Greasy Hull, Glass Cannon, Hot Streak, Crate Magnet, ...); kept until that level is beaten |
| Leaderboard and ghost ships | `social` | Race a translucent ghost of your best run on each level (AHEAD/BEHIND chip); shared leaderboard for today's Daily Strait and career earnings, with a callsign |
| Captain portrait | `captain` | Cartoon captain in the HUD: sweats near mines, screams at missiles, chews pizza, salutes buyers, sulks when boarded |

Optional features live in their own files. They register with `feature({ id, name, group, desc })`, check
`feat(id)` before doing anything, and react to game events through `onEvt(name, fn)`. The core game only
calls `emit(...)`, so with every feature off it plays like the original game.

Events: `levelStart`, `update`, `levelEnd`, `port`, `portLedger`, `title`, `boot`, `preDeliver`, `deliver`,
`full`, `hot`, `nearMiss`, `hurt`, `explode`, `ff`, `chain`, `ciwsKill`, `boarded`, `shaken`, `pizza`,
`crate`, `flare`, `honk`, `aground`, `badge`, `chips`, `flags`, and the draw layers `drawSea`, `drawAir`,
`drawScreen`.

## Shared leaderboard
On claude.ai the game is published with the artifact `db` and `user` capabilities. Each player writes one
document, `scores/<their user id>` (callsign, career earnings, best level, today's Daily Strait score), and
everyone reads the `scores` collection:

```js
capabilities: {
  db: { rules: [ { path: 'scores', read: 'view', write: 'owner' }, { path: 'scores/{self}', write: 'interact' } ] },
  user: {}
}
```

People who can only view the artifact see the board but cannot post. Opened anywhere else (for example
`dist/index.html` from disk) the leaderboard shows the player's own scores from this browser. Ghost runs
are always stored locally.

## Project layout
| File | What it holds |
| --- | --- |
| `src/page.html` | Title, fonts, CSS, HUD and menu markup |
| `src/js/00-features.js` | Feature switch registry and the event bus |
| `src/js/01-core.js` | Utilities, coastline data, map/collision build, routing, save data, upgrades, level design |
| `src/js/02-audio.js` | Sound effects and the music loop (WebAudio) |
| `src/js/03-game.js` | Game state, tanker physics, damage, explosions, economy, win/lose |
| `src/js/04-hazards.js` | Mines, traffic, speedboats, drones, missiles, ballistics, subs, power-ups, main update |
| `src/js/05-render.js` | Chart rendering, ships, effects, night mode, minimap |
| `src/js/06-ui.js` | Input, HUD, title/pause/port screens, boot |
| `src/js/07-dev.js` | Developer settings screen |
| `src/js/08-captain.js` | Feature: captain portrait |
| `src/js/09-events.js` | Feature: special orders and rubber duck convoys |
| `src/js/10-skins.js` | Feature: ship skins |
| `src/js/11-absurd.js` | Feature: absurd enemies |
| `src/js/12-replay.js` | Feature: close-call replay |
| `src/js/13-daily.js` | Feature: Daily Strait |
| `src/js/14-missions.js` | Feature: missions |
| `src/js/15-legend.js` | Feature: Captain Legend meter |
| `src/js/16-perks.js` | Feature: perk picks |
| `src/js/17-social.js` | Feature: ghost runs and shared leaderboard |
| `src/js/99-start.js` | Starts the game after every feature has registered |

The JS files share one global scope and are concatenated in order by `build.sh`.

## Testing
`tools/smoke-test.js` drives the built page in headless Chromium with Playwright
(power-ups, flares, boarding, pause, sinking, time-out, menus) and prints any errors.
`tools/features-test.js` runs one check per optional feature, plus a run with every feature off:

```sh
./build.sh && node tools/smoke-test.js "$PWD" && node tools/features-test.js
```

Progress is saved in the player's browser (`localStorage`).
