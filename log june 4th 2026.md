# Project Log — Lofi WebGL F1 Birthday Game for Clark

A cute, lofi night-time WebGL racing game. Drive a low-poly F1 car around a winding
pastel circuit; an F1-style countdown leads into a celebration with fireworks, a giant
birthday cake, balloons, animated gif signs, and a "Happy Birthday Clark!" banner.

Built with **Three.js + Vite**. This log captures everything done so a future session can
resume quickly.

---

## How to run / build

```bash
npm install          # deps: three, gifuct-js (dev: vite)
npm run dev          # local dev server (click "Start Race" — audio needs a gesture)
npm run build        # production bundle -> dist/
npm run preview      # preview the built bundle
```

- Deploy: drag `dist/` into Netlify, **or** connect the repo with build command
  `npm run build` and publish dir `dist`. `vite.config.js` sets `base: './'` so it works
  from any static host (no config/_redirects needed).
- ⚠️ There is **no git remote** in this environment and **commit signing fails** (infra
  HTTP 400). Work was delivered as zips via the chat each turn. To version it, init your
  own git remote locally and push.

## Controls
↑/W accelerate · ↓/S brake/reverse · ←→/A D steer · **Space** boost (3s + cooldown).

---

## Project structure

```
index.html              full-screen canvas + HUD (countdown gantry, boost bar, hint,
                        loading splash, tap-to-start overlay) + all CSS
vite.config.js          base: './', host: true
src/
  main.js               bootstrap: renderer, scene, night lights, bloom composer,
                        chase camera, game state machine, main loop, wiring of all modules
  config.js             ALL tunables (see below)
  track.js              CatmullRom loop -> road ribbon + kerbs + ground + trees + start line
  car.js                loads external OBJ F1 model (procedural fallback) + arcade physics
  input.js              keyboard (arrows/WASD + space); locked until countdown ends
  boost.js              3s boost state machine + flame + particle trail + FOV kick + HUD
  countdown.js          F1 5-light gantry sequence + synthesized beeps; lights turn GREEN at GO
  audio.js              celebration music (public/sounds/start.mp3); starts on "Start Race" click
  engine.js             synthesized engine sound (pulsing, revs with speed — not a drone)
  birthday.js           exports FloatingText: generic 3D banner (FontLoader/TextGeometry) + pop-in
  placeholders.js       13 photo billboards along the track; hidden until GO; pop-in
  gifs.js               animated signs (24): local WebP/GIF (decoded) > Giphy > built-in; hidden until GO
  fireworks.js          GPU shader fireworks + bloom + colored explosion lights on the track
  cake.js               3-tier cake: candles on ALL tiers + wrap-around bottom text + circular photo topper
  balloons.js           pastel balloons (infield + outer ring); hidden until GO
  photoTopper.js        shared helper: makeCircularPhoto(url, radius) — circular framed photo
  (3 FloatingText banners are created in main.js: start, 1/3, 2/3 around the loop)
public/
  sounds/               drop start.mp3 (celebration sound) here
  images/               numbered 1.jpg..13.jpg for the photo billboards; clark_topper.png (topper)
  gifs/                 animated webp/gif signs + manifest.json + README.txt
  models/               LowpolyF1.obj + Colores03.png (car model + texture)
```

---

## Game state machine
`LOADING -> READY -> COUNTDOWN -> RACING`
- Boot waits for the 3D font (all 3 banners), the **car model**, before READY (splash hides).
- Click "Start Race" (required browser gesture for audio) -> creates `AudioContext`,
  `EngineSound`, **starts the music** (`celebration.play()`), runs the countdown.
- **On lights-out (GO):** unlock input, reveal all 3 floating banners, reveal the 13 photo
  billboards, **reveal the gif signs + balloons**, start continuous fireworks, start engine.

---

## Feature history (chronological — what each request added)

1. **Initial build** — Vite+Three scaffold; track, car, chase cam, boost, F1 countdown,
   celebration sound hook, 3D birthday banner, 13 photo billboards. Verified via headless
   Chrome (SwiftShader/ANGLE flags) screenshots.
2. **Countdown lights turn GREEN at GO**; birthday text made smaller and lowered so both
   lines fit on screen.
3. **Night scene** (dark sky, stars, moon, moonlight, fog) + **big infield cake** +
   **balloons** + **continuous fireworks** + photos **hidden until countdown ends**.
4. **More fireworks** + **animated "gif" signs** scattered around (originally procedural
   canvas flipbooks) + **track lights up** on each explosion (point lights + scene-wide tint).
5. **Giphy support** (optional API key) and **higher-fidelity fireworks**: rewritten as a
   **GPU shader particle system** + **UnrealBloom** post-processing (camera-facing sparks,
   twinkle, gravity, multi-hue). Bursts biased ahead of the car; camera tilted up to show sky.
6. **Outer-ring balloons** around the track; **bigger firework sparks**; **camera tilted up**.
7. **Local GIF folder support**: signs load/animate real files from `public/gifs/`
   (gifuct-js decoder) — priority over Giphy/built-in.
8. **Animated WebP**: 10 `hbd*.webp` added; decoded via browser **ImageDecoder** (WebCodecs);
   frames downscaled to ~220px (MAX_TEX) to bound GPU memory. Listed in `manifest.json`.
9. **Photo cake topper**: extracted `clark_topper.png` (was pasted inline; pulled from the
   session transcript) and placed it on a stick above the cake.
10. **Candles on all cake tiers**; **engine sound** added; **gif signs cleared from the
    start line** (avoid-zone, radius 34 around start).
11. **Engine sound reworked** to pulse/rev (amplitude-modulated tone + filtered noise) so it
    no longer drones. Verified by offline-rendering and measuring modulation depth/pulse rate.
12. **New car model**: swapped procedural car for uploaded `LowpolyF1.obj` (+ `Colores03.png`),
    auto-fit (length 5, nose = +Z, sits on ground), slight emissive for night. **Clark's photo
    added on top of the car** (billboard). Kept procedural fallback.
13. **Circular photo toppers**: both car + cake photos use `makeCircularPhoto()` (CircleGeometry
    crop + cream ring) — shared in `src/photoTopper.js`.
14. **Removed `hbd4.webp` and `hbd6.webp`** (and from manifest) — 8 gifs remain.
15. **Added 16 more gifs** (`hbd11..hbd31`, `hdb15/18/19/24`; one sanitized from `hbd=31`) →
    **24 total** in `manifest.json`. Bumped gif-sign count 11 → **24** so each gets its own
    spot. Lowered `MAX_TEX` 220 → **160** to bound memory with more signs.
16. **Custom celebration sound**: user's `digitallove.mp3` saved as `public/sounds/start.mp3`.
17. **Music starts on the "Start Race" click** (moved `celebration.play()` into
    `beginCountdown()`), so it plays through the countdown into the race.
18. **Asset compression for download size** (zips had ballooned to 33 MB): mp3 re-encoded
    322 → 128 kbps (12 MB → 5.1 MB); all 24 gifs resized to 240px @ q50 via **sharp**
    (animation preserved; 21.5 MB → 5.5 MB). Zips back to ~11 MB. Tools used: `ffmpeg-static`
    (mp3) and `sharp` (animated webp) — installed `--no-save`, not app deps.
19. **`FloatingText` refactor**: `birthday.js` now exports a generic `FloatingText`
    (configurable lines/sizes/lineGap/offset/y/anchor). Added **two more banners** around the
    loop via an `anchorAt(t)` helper in `main.js`:
      - 1/3: "Thank you for" / "being awesome"
      - 2/3: "We wouldn't change" / "a thing about you! :)"
    (Start/finish still has "Happy Birthday Clark!".) All reveal at GO, face oncoming cars.
20. **Gifs + balloons hidden until GO** (added `reveal()` to `BirthdayGifs` and `Balloons`,
    called in `onLightsOut` alongside the photos).
21. **Fireworks particles 3× bigger** (`uSize` ~0.26→~0.78 in `fireworks.js`; point-size
    clamp 64 → 192).
22. **"HAPPY BIRTHDAY CLARK!" wrapped around the cake's bottom tier** — `_buildBottomText()`
    in `cake.js` draws a canvas text band (cream fill + dark-plum outline) on a thin
    open-ended cylinder just outside the tier; `texture.repeat.x = 3` so it reads from any angle.

---

## Tunables (`src/config.js`)
- `COLORS` — pastel palette (car/track/trees/text).
- `NIGHT` — sky / fog / moon / star colors.
- `BLOOM` — `{ strength: 0.55, radius: 0.4, threshold: 0.85 }`.
- `CAR` — accel, maxSpeed, steer, friction, bodyLean, wheelRadius.
- `BOOST` — `duration: 3`, cooldown, speed/accel multipliers, FOV `{normal:60, boost:78}`.
- `TRACK_POINTS`, `ROAD_WIDTH: 9` — circuit shape/width.
- `PLACEHOLDER_COUNT: 13`.
- `SOUND_FILE: './sounds/start.mp3'`.
- `GIFS` — `{ folder: './gifs/', max: 24 }`.
- `GIPHY` — `{ apiKey: '', tag: 'happy birthday', count: 30, rating: 'g' }`.

Other notable in-file constants:
- `src/car.js` `MODEL = { obj, texture, length: 5, yawDeg: 0 }`.
- `src/gifs.js` `MAX_TEX = 160` (per-frame texture cap for memory).
- `src/fireworks.js` spawn interval / burst count / `uSize` (spark size, now ~0.78–1.26) /
  point-size clamp (192) / point-light intensity / scene-flash cap.
- `src/engine.js` waveshaper drive amount, `lfoDepth`, noise/tone gains, RPM mapping.
- `src/main.js` the 3 `FloatingText` banners + `anchorAt(t)`; gif-sign count (24);
  `cake.js` `_buildBottomText` (`repeat.x = 3`, font/colors) for the wrap-around text.

---

## Personalize (drop-in assets)
- **Celebration music:** `public/sounds/start.mp3` (currently the user's track; starts on
  the "Start Race" click). It was re-encoded to 128 kbps to keep the bundle downloadable.
- **13 photos:** `public/images/1.jpg … 13.jpg` (replace numbered placeholders).
- **Topper photo:** `public/images/clark_topper.png` (used on car + cake, shown circular).
- **Animated signs:** `public/gifs/` — animated `.webp` or `.gif`. Choose via
  `manifest.json` (array of filenames) **or** number them `1.gif/1.webp`, `2…`. Empty
  folder -> built-in animated party signs. (Currently **24** `hbd*/hdb*.webp` in the manifest,
  resized to 240px @ q50 to keep size down.)
- **Giphy alternative:** set `GIPHY.apiKey` in `config.js` (used only if `public/gifs/`
  is empty). Plays MP4 renditions as video textures.
- **Car model:** `public/models/LowpolyF1.obj` + `Colores03.png`. Adjust fit with
  `MODEL.length` / `MODEL.yawDeg` in `src/car.js`.
- **Floating banner text:** edit the `FloatingText` instances in `src/main.js` (lines/sizes)
  and their track positions via `anchorAt(t)` (t = 0..1 around the loop).
- **Cake bottom-tier text:** the string in `_buildBottomText()` in `src/cake.js`.

> Keeping the bundle small: large new mp3/webp can be re-compressed with `ffmpeg-static`
> (audio) and `sharp` (animated webp resize) — installed `--no-save`; see history #18.

---

## Notable implementation details / gotchas
- **Bloom**: `EffectComposer` + `RenderPass` + `UnrealBloomPass` + `OutputPass`; render loop
  uses `composer.render()`; resize updates composer + `fireworks.setResolution(height)`.
  Threshold kept high (0.85) so the pastel scene doesn't wash out; the start/finish line was
  dimmed to stop it blooming into a bar.
- **Fireworks** are individual shader `Points` bursts (created/disposed per burst) driven by a
  `uProgress` uniform; point size clamped (≤192px) to avoid giant near blobs.
- **Animated WebP** needs `ImageDecoder` (Chrome/Edge). Safari/Firefox fall back to the
  **first frame as a static image** (still correct picture). `.gif` animates cross-browser
  via gifuct-js. Converting webp→gif would make them animate everywhere.
- **Audio** (countdown beeps, celebration music, engine) only starts after the "Start Race"
  click (browser autoplay policy); the music now begins on that click.
- **Hidden until GO:** photo billboards, gif signs, and balloons all start `visible = false`
  and are revealed in `onLightsOut()` (the 3 banners + fireworks + engine also start then).
- **`FloatingText`** (in `birthday.js`) is generic; `main.js` builds 3 banners and places
  them with `anchorAt(t)` (faces oncoming cars via `rotation.y = angle + PI`).
- **Cake bottom text** wraps via an open-ended `CylinderGeometry` band with a `RepeatWrapping`
  canvas texture (`repeat.x = 3`) just outside the tier.
- **Engine sound** is amplitude-modulated at the firing rate (the pulsing is what avoids the
  drone); pitch/brightness/volume scale with speed; revs higher during boost.
- **Toppers** billboard toward the camera each frame (Y-locked) and gently bob.
- **Car wheels** don't spin (single-mesh model); body still leans into corners.

---

## Verification approach used
Headless Chrome via `puppeteer-core` (Chrome at
`/root/.cache/puppeteer/chrome/...`) with flags
`--use-angle=swiftshader --use-gl=angle --enable-unsafe-swiftshader` for WebGL. Took
screenshots after driving scripted inputs; for audio, instrumented Web Audio
(counted live oscillators) and offline-rendered the engine to measure pulse rate +
modulation depth. Scratch verify scripts (`*.mjs`) and screenshots were deleted before
zipping each delivery.

---

## Possible next steps / ideas
- Lap timing / HUD speedometer.
- Mobile touch controls.
- Optional gif→gif conversion for cross-browser animation.
- Wheel-spin if the model is split into named wheel meshes.
- Tune the upward camera tilt (`lookTarget` `+6` in `src/main.js`) if the car sits too low.
