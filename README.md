# Strait Outta Hormuz

An arcade browser game on a nautical chart of the Strait of Hormuz. You drive an oil tanker:
load crude at oil fields inside the Gulf, sail out through the Strait, and sell to India, China,
Japan or Europe — while dodging sea mines, speedboat boarding parties, drones, cruise missiles,
ballistic strikes and torpedoes.

No frameworks, no assets: one HTML page with canvas rendering and WebAudio-synthesized sound.

## Play
- Live version: published as a claude.ai Artifact.
- Locally: run `./build.sh`, then open `dist/index.html` in a browser.

## Controls
| Action | Keyboard / mouse | Phone |
| --- | --- | --- |
| Steer | WASD or arrows, or hold the left mouse button | Drag anywhere |
| Flares | Space or right-click | FLARE button |
| Honk | H | HONK button |
| Pause | P or Esc | II button |
| Mute | M | SND button |

## Project layout
| File | What it holds |
| --- | --- |
| `src/page.html` | Title, fonts, CSS, HUD and menu markup |
| `src/js/01-core.js` | Utilities, coastline data, map/collision build, routing, save data, upgrades, level design |
| `src/js/02-audio.js` | Sound effects and the music loop (WebAudio) |
| `src/js/03-game.js` | Game state, tanker physics, damage, explosions, economy, win/lose |
| `src/js/04-hazards.js` | Mines, traffic, speedboats, drones, missiles, ballistics, subs, power-ups, main update |
| `src/js/05-render.js` | Chart rendering, ships, effects, night mode, minimap |
| `src/js/06-ui.js` | Input, HUD, title/pause/port screens, boot |

The JS files share one global scope and are concatenated in order by `build.sh`.

## Testing
`tools/smoke-test.js` drives the built page in headless Chromium with Playwright
(power-ups, flares, boarding, pause, sinking, time-out, menus) and prints any errors:

```sh
./build.sh && node tools/smoke-test.js "$PWD"
```

Progress is saved in the player's browser (`localStorage`).
