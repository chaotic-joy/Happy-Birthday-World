# 🏎️ Happy Birthday Clark! — a lofi WebGL F1 game

A cute, low-poly Formula 1 car you drive around a looping pastel circuit. Real-F1
start lights count you in; when the lights go out, a celebration sound plays and a
big 3D **"Happy Birthday Clark!"** banner pops into view. 13 photo billboards float
beside the track for you to fill with pictures.

Built with [Three.js](https://threejs.org) + [Vite](https://vitejs.dev).

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
```

Build a static bundle for hosting:

```bash
npm run build    # output in dist/
npm run preview  # preview the production build
```

## Controls

| Key | Action |
| --- | --- |
| ↑ / W | Accelerate |
| ↓ / S | Brake / reverse |
| ← → / A D | Steer |
| **Space** | Boost (3s, then a short cooldown) |

Click **Start Race** first — the browser needs a click before it will play sound.

## Make it yours

### 🔊 Celebration sound
Drop your audio file here (it plays the moment the lights go out):

```
public/sounds/start.mp3
```

To use a different filename/path, edit `SOUND_FILE` in `src/config.js`.

### 🖼️ The 13 photos
Replace the numbered placeholders by adding images named `1.jpg` … `13.jpg`:

```
public/images/1.jpg
public/images/2.jpg
...
public/images/13.jpg
```

Each loads automatically over its placeholder. Landscape ~3:2 images look best.

### 🎬 Animated signs (your own GIFs / WebP)
The signs around the grass play the animated files in `public/gifs/`. **Clark's 10
animated `.webp` birthday gifs are already bundled** (`hbd*.webp`, listed in
`public/gifs/manifest.json`). Both **animated WebP** (decoded via the browser's
`ImageDecoder`) and **GIF** are supported. This takes priority over Giphy and the
built-in signs.

To change them:
- **Manifest:** edit `public/gifs/manifest.json` — a JSON array of filenames in
  display order, e.g. `["clark.webp", "cake.gif"]`.
- **Or numbered:** delete the manifest and name files `1.webp`/`1.gif`, `2…`,
  consecutively.

Frames are downscaled to ~220px on decode to keep GPU memory reasonable (tune
`MAX_TEX` in `src/gifs.js`). An empty folder falls back to the built-in animated
signs. If you drag-and-drop the prebuilt `dist/`, the files are already copied to
`dist/gifs/` by the build.

### 🎬 Birthday GIFs from Giphy (optional alternative)
Instead of local files, you can pull **birthday GIFs from Giphy**: grab a free API
key from https://developers.giphy.com and paste it into `GIPHY.apiKey` in
`src/config.js` (used only when `public/gifs/` is empty):

```js
export const GIPHY = {
  apiKey: 'YOUR_KEY_HERE',
  tag: 'happy birthday', // search term
  count: 30,
  rating: 'g',
};
```

The gifs are fetched at runtime and played as MP4 video textures on the signs. If the
key is blank, the request fails, or no gifs return, it silently falls back to the
built-in animated signs.

### 🎨 Tuning
Everything tweakable lives in `src/config.js`:
- `BLOOM` — glow strength / radius / threshold for the fireworks, candles, and neon.
- `GIPHY` — API key and search term for the birthday gifs.

- `COLORS` — pastel palette for the car, track, trees, text.
- `CAR` — acceleration, top speed, steering, grip feel.
- `BOOST` — duration (default 3s), cooldown, speed/accel multipliers, FOV kick.
- `TRACK_POINTS` / `ROAD_WIDTH` — the shape and width of the circuit.

## How it fits together

```
src/
  main.js          bootstrap, render loop, game state machine, chase camera
  config.js        all tunables (colors, speeds, boost, track shape)
  track.js         looping curve → road ribbon, kerbs, ground, trees
  car.js           low-poly F1 model + arcade driving physics
  input.js         keyboard (arrows + space), locked during the countdown
  boost.js         3s boost state machine + flame + particle trail + FOV
  countdown.js     F1 5-light gantry sequence + synthesized beeps
  audio.js         plays the celebration sound on lights-out
  birthday.js      3D "Happy Birthday Clark!" banner + pop-in animation
  placeholders.js  13 billboards along the track (swap in your photos)
```

State flow: `LOADING → READY → COUNTDOWN → RACING`. Controls unlock the instant the
lights go out.
