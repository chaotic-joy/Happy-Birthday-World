# 🏎️ Happy Birthday Clark! — Lofi WebGL F1 Birthday Game

A cute, lofi **night-time** WebGL racing game built as a birthday surprise for
Clark. Drive a low-poly F1 car around a winding pastel circuit under a starry
sky. A real F1-style five-light countdown leads into a full celebration:
fireworks, a giant three-tier birthday cake, balloons, animated signs, 12 floating
photos, and big 3D **"Happy Birthday Clark!"** banners.

Built with **[Three.js](https://threejs.org/) + [Vite](https://vitejs.dev/)**.

---

## 📦 What's in this folder

| Item | What it is |
| ---- | ---------- |
| `source/` | Full **source** project, already extracted (src, public assets, configs) |
| `dist/` | Pre-built **production bundle**, already extracted — serve it to play |
| `source.zip` | Zipped copy of the source project |
| `dist.zip` | Zipped copy of the production bundle |
| `lowpoly-f1-car.zip` | The low-poly F1 car model (OBJ + texture) |
| `clark headshot.png` | Source headshot (the cake topper `clark_topper.png` is derived from this) |
| `log june 4th 2026.md` | Detailed development log / feature history / gotchas |
| `README.md` | This file |

> ℹ️ The project was produced in a remote Claude Code session with **no git
> remote** (commit signing was failing there), so each iteration was delivered as
> zips. To version it yourself: `cd source`, `git init`, and push to your own remote.

---

## 🚀 Quick start

### Option A — just play it (pre-built, nothing to install)

```bash
cd dist
python3 -m http.server 8000      # or: npx serve .
```

Open **http://localhost:8000**, click **"Start Race"**, and enjoy. (Audio needs a
click to start — the Start Race button provides that gesture.)

### Option B — run / develop from source

```bash
cd source
npm install          # deps: three, gifuct-js  (dev: vite)
npm run dev          # local dev server
npm run build        # production bundle -> dist/
npm run preview      # preview the built bundle
```

`vite.config.js` sets `base: './'`, so the build works from any static host
(GitHub Pages, Netlify, Vercel, a plain file server) with no extra config.

---

## 🎮 Controls

| Key | Action |
| --- | ------ |
| **↑ / W** | Accelerate |
| **↓ / S** | Brake / reverse |
| **← → / A D** | Steer |
| **Space** | Boost (3 seconds, then a cooldown) |

Input stays locked until the countdown ends — you can't jump the start. 🚦

---

## ✨ Features

- **🌙 Lofi night scene** — dark sky, stars, moon, moonlight, and fog.
- **🏎️ Low-poly F1 car** — loads an external OBJ model (`LowpolyF1.obj`) with a
  procedural fallback, plus arcade-style physics; the body leans into corners.
- **🛣️ Winding pastel circuit** — a CatmullRom loop rendered as a road ribbon with
  kerbs, ground, trees, and a start line.
- **🚀 Boost** — tap Space for a 3-second burst with a flame, particle trail, a
  camera FOV kick, and a HUD bar; followed by a cooldown.
- **🚦 F1 countdown** — five-light gantry with synthesized beeps; lights turn
  **green** on "GO" (lights-out).
- **🔊 Sound** — a celebration track (`public/sounds/start.mp3`, **included**) plays
  on lights-out, plus a synthesized engine that pulses and revs with speed.
- **🎉 3D birthday banners** — three "Happy Birthday Clark!" banners built with
  `TextGeometry`, placed around the track to face oncoming cars, popped in at the start.
- **🖼️ 12 photo billboards** — float along the track, hidden until GO, then pop in
  (photos `1.png`..`12.png` are **included**).
- **🎆 GPU fireworks** — shader-based particle bursts with UnrealBloom; explosions
  cast colored light onto the track.
- **🎂 Giant cake** — a 3-tier infield cake with candles on every tier, wrap-around
  text, and a circular photo topper of Clark.
- **🎈 Balloons** — pastel clusters in the infield plus an outer ring around the track.
- **🪧 Animated signs** — ~24 animated WebP/GIF signs (decoded via WebCodecs /
  gifuct-js), with optional Giphy support and built-in fallbacks.

---

## 🧠 How it works

**Tech:** Three.js for the 3D scene/rendering, an `EffectComposer` +
`UnrealBloomPass` post-processing chain for glow, and Vite for the dev server +
bundling. No backend — it's a static site.

**Game state machine:** `LOADING → READY → COUNTDOWN → RACING`

- Boot waits for **both** the 3D font and the car model before becoming READY
  (then the loading splash hides).
- Clicking **"Start Race"** (the browser gesture required to enable audio) creates
  the `AudioContext` and engine sound, then runs the countdown.
- **On lights-out (GO):** input unlocks, the celebration track plays, the three
  birthday banners appear, the 12 photos / gif signs / balloons (all hidden until
  now) pop in, continuous fireworks start, and the engine sound kicks in.

### Project structure (`source/`)

```
index.html              full-screen canvas + HUD (countdown gantry, boost bar,
                        hint, loading splash, tap-to-start overlay) + all CSS
vite.config.js          base: './', host: true
package.json            scripts + deps (three, gifuct-js, vite)
src/
  main.js               bootstrap: renderer, scene, night lights, bloom composer,
                        chase camera, state machine, main loop, module wiring
  config.js             ALL tunables in one place
  track.js              CatmullRom loop -> road ribbon + kerbs + ground + trees + start line
  car.js                loads external OBJ F1 model (procedural fallback) + arcade physics
  input.js              keyboard (arrows/WASD + space); locked until countdown ends
  boost.js              3s boost state machine + flame + particle trail + FOV kick + HUD
  countdown.js          F1 5-light gantry sequence + synthesized beeps; GREEN at GO
  audio.js              celebration track (public/sounds/start.mp3) on lights-out
  engine.js             synthesized engine sound (amplitude-modulated; revs with speed)
  birthday.js           generic FloatingText; main.js builds 3 banners + pop-in
  placeholders.js       12 photo billboards along the track; hidden until GO
  gifs.js               animated signs: local WebP/GIF (decoded) > Giphy > built-in
  fireworks.js          GPU shader fireworks (per-burst Points) + bloom + explosion lights
  cake.js               3-tier infield cake: candles on all tiers + wrap text + photo topper
  balloons.js           pastel balloons (infield cluster + outer ring)
  photoTopper.js        helper: makeCircularPhoto(url, radius) — circular framed photo
public/
  sounds/start.mp3      celebration track (included)
  images/               1.png..12.png (billboard photos) + clark_topper.png (cake topper)
  gifs/                 ~24 animated webp signs + manifest.json + README.txt
  models/               LowpolyF1.obj + Colores03.png (car model + texture)
```

---

## 🖼️ Swapping in your own photos

Everything is already in place — the celebration sound (`start.mp3`), the cake
topper, and all **12 billboard photos** (`1.png`..`12.png`). To customize:

- Replace `1.png`..`12.png` in `source/public/images/` with your own (16:9 images
  look best; missing files just fall back to a numbered "Photo N" placeholder).
- To add/change animated signs, put WebP/GIF files in `source/public/gifs/` and
  list them in `manifest.json` (see `public/gifs/README.txt`). Optional Giphy
  support exists via an API key.

> Browser note: animated **WebP** needs `ImageDecoder` (Chrome/Edge). Safari/Firefox
> show the first frame as a static image (still the right picture); `.gif` animates
> everywhere via gifuct-js.

---

## 🌐 Deploying

It's a static site, so deployment is just shipping the build output:

- **Netlify** — drag the `dist/` folder in, **or** connect the repo with build
  command `npm run build` and publish dir `dist`.
- **Vercel / GitHub Pages** — same idea; `base: './'` means it works from any
  subpath with no redirect config.

---

## 💛 Made with love for Clark's birthday.
