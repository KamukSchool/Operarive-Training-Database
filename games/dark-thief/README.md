# Shadow Thief — Dark Thief / Nyx

Standalone HTML5 canvas heist game (linker pedagogy, corporate noir).

**Not** a reskin of Knight's Quest: different story (Nyx / Babel Vault), ALERT + Covers instead of fever/mount, vertical dossier options, floors 1–8 with modern silhouettes, GHOST / CLEAN / SPOTTED grades, procedural Web Audio, cyan/slate/magenta UI (Syne + JetBrains Mono).

## Play

Open `index.html` via any static server (hub launch or local). Assets load from `assets/manifest.json`.

## Loop

- Steal the correct English linker word under timer pressure
- Wrong answer / timeout raises **ALERT**; at 100 you lose a **Cover** (3 covers)
- Silent streak builds **Shadow Veil** (visual cloak) and upgrades attack (dagger → bow → throw)
- 8 infiltration floors; floor 8 = Vault Boss
- Best loot XP in `localStorage` key `st_best`

## Assets

Sprite sheet pack in `assets/` (idle, attack, bow, throw, run, walk, roll, crouch, hurt, death, jump, slide, climb, …). Frame size from `manifest.json` (~815×759).

## SFX

Stealth/heist WAV pack in `assets/sfx/` (whoosh, metal, ghost, clean, spotted, alarm, veil, ambient rooftop loop, …). Regenerate with `node generate-sfx.js`.
