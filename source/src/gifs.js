import * as THREE from 'three';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { GIPHY, GIFS } from './config.js';

// Animated "birthday gif" signs scattered around the environment. Each sign is a
// little flipbook: we pre-render a handful of canvas frames at startup and cycle
// through them (cheap — just swaps the texture, no per-frame redraw), so they
// animate like GIFs with zero external assets. Emoji render in color in browsers.
const STYLES = [
  { emoji: '🎂', text: 'Happy Birthday!', hue: 330 },
  { emoji: '🎉', text: 'Hooray!', hue: 280 },
  { emoji: '🥳', text: 'Party Time!', hue: 205 },
  { emoji: '🎈', text: 'Clark!', hue: 160 },
  { emoji: '🎁', text: 'Surprise!', hue: 40 },
  { emoji: '🍰', text: 'Yum!', hue: 350 },
  { emoji: '✨', text: 'Make a Wish', hue: 50 },
  { emoji: '🎊', text: 'Cheers!', hue: 300 },
  { emoji: '🕯️', text: 'Blow them out!', hue: 25 },
];

const FRAMES = 12;

export class BirthdayGifs {
  constructor(scene, curve, count = 11, avoid = null) {
    this.signs = [];
    this.group = new THREE.Group();
    this.group.visible = false; // hidden until the countdown is over
    scene.add(this.group);

    for (let i = 0; i < count; i++) {
      const style = STYLES[i % STYLES.length];
      const specks = makeSpecks(16);
      const frames = buildFrames(style, specks);

      const sign = new THREE.Group();

      // Wooden post so it stands in the grass like a lawn sign.
      const postH = 3 + Math.random() * 3;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, postH, 8),
        new THREE.MeshStandardMaterial({ color: 0xb98a5e, roughness: 0.9 })
      );
      post.position.y = postH / 2;
      sign.add(post);

      // Panel pivot billboards toward the camera.
      const pivot = new THREE.Group();
      pivot.position.y = postH + 2.4;

      const size = 4.6;
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(size + 0.5, size + 0.5),
        new THREE.MeshBasicMaterial({ color: 0xfff6e9, side: THREE.DoubleSide })
      );
      pivot.add(frame);

      const picMat = new THREE.MeshBasicMaterial({ map: frames[0], side: THREE.DoubleSide });
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(size, size), picMat);
      pic.position.z = 0.03;
      pivot.add(pic);

      sign.add(pivot);

      this._size = size;

      // Scatter around the whole scene, avoiding the central cake and (if given)
      // a zone around the start/finish line.
      let x, z;
      let tries = 0;
      do {
        x = (Math.random() - 0.5) * 280;
        z = (Math.random() - 0.5) * 280;
        tries++;
      } while (
        tries < 50 &&
        (x * x + z * z < 22 * 22 ||
          (avoid && (x - avoid.x) ** 2 + (z - avoid.z) ** 2 < avoid.r * avoid.r))
      );
      sign.position.set(x, 0, z);

      this.group.add(sign);
      this.signs.push({
        pivot,
        picMat,
        picMesh: pic,
        frames,
        fps: 7 + Math.random() * 5,
        t: Math.random() * 1,
        frame: -1,
        baseY: pivot.position.y,
        bobPhase: Math.random() * Math.PI * 2,
        video: null,
        videoTex: null,
        gif: null,
        gifTime: 0,
        gifIndex: -1,
      });
    }

    // Source priority: local GIFs in public/gifs/  >  Giphy (if key)  >  built-in signs.
    this._loadSources();
  }

  async _loadSources() {
    const used = await this._loadFolder();
    if (!used && GIPHY.apiKey) this._loadGiphy();
  }

  // Decode and apply any .gif files found in the configured folder. Returns true
  // if at least one GIF was applied to the signs.
  async _loadFolder() {
    try {
      let gifs = [];
      const names = await this._manifest();
      if (names) {
        // Manifest present (authoritative): load exactly these files.
        const res = await Promise.all(
          names.map((n) => loadAnimatedImage(GIFS.folder + n).catch(() => null))
        );
        gifs = res.filter((g) => g && g.textures.length);
      } else {
        // No manifest: load 1.gif, 2.gif, … stopping at the first gap (so an
        // empty folder costs a single request).
        for (let i = 1; i <= GIFS.max; i++) {
          const g = await loadAnimatedImage(GIFS.folder + `${i}.gif`).catch(() => null);
          if (g && g.textures.length) gifs.push(g);
          else break;
        }
      }
      if (!gifs.length) return false;

      for (let i = gifs.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [gifs[i], gifs[j]] = [gifs[j], gifs[i]];
      }
      this.signs.forEach((s, i) => this._applyGif(s, gifs[i % gifs.length]));
      console.info(`[gifs] loaded ${gifs.length} GIF(s) from ${GIFS.folder}`);
      return true;
    } catch (e) {
      console.info('[gifs] folder load failed, falling back:', e.message);
      return false;
    }
  }

  async _manifest() {
    try {
      const r = await fetch(GIFS.folder + 'manifest.json');
      if (!r.ok) return null;
      const list = await r.json();
      return Array.isArray(list) ? list : null;
    } catch {
      return null;
    }
  }

  _applyGif(sign, gif) {
    sign.gif = gif;
    sign.gifTime = 0;
    sign.gifIndex = 0;
    sign.video = null;
    sign.picMat.map = gif.textures[0];
    sign.picMat.needsUpdate = true;
    // Fit the (possibly non-square) GIF within the square sign without distortion.
    const aspect = gif.width / gif.height;
    if (aspect >= 1) sign.picMesh.scale.set(1, 1 / aspect, 1);
    else sign.picMesh.scale.set(aspect, 1, 1);
  }

  async _loadGiphy() {
    try {
      const url =
        'https://api.giphy.com/v1/gifs/search?api_key=' +
        encodeURIComponent(GIPHY.apiKey) +
        '&q=' + encodeURIComponent(GIPHY.tag) +
        '&limit=' + GIPHY.count +
        '&rating=' + GIPHY.rating;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Giphy HTTP ' + res.status);
      const json = await res.json();
      const mp4s = (json.data || [])
        .map((g) => {
          const im = g.images || {};
          return (im.original_mp4 && im.original_mp4.mp4) ||
            (im.looping && im.looping.mp4) ||
            (im.fixed_height && im.fixed_height.mp4) || null;
        })
        .filter(Boolean);

      if (!mp4s.length) {
        console.info('[giphy] no MP4 renditions returned; keeping animated signs.');
        return;
      }
      // shuffle
      for (let i = mp4s.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [mp4s[i], mp4s[j]] = [mp4s[j], mp4s[i]];
      }
      this.signs.forEach((s, i) => this._applyVideo(s, mp4s[i % mp4s.length]));
    } catch (e) {
      console.info('[giphy] could not load gifs, using animated signs instead:', e.message);
    }
  }

  _applyVideo(sign, src) {
    const v = document.createElement('video');
    v.src = src;
    v.crossOrigin = 'anonymous';
    v.loop = true;
    v.muted = true;
    v.playsInline = true;
    v.autoplay = true;
    v.addEventListener('loadeddata', () => {
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      sign.picMat.map = tex;
      sign.picMat.needsUpdate = true;
      sign.video = v;
      sign.videoTex = tex;
      v.play().catch(() => {});
    });
    v.addEventListener('error', () => {
      /* keep the procedural animated sign */
    });
    v.load();
  }

  reveal() {
    this.group.visible = true;
  }

  update(dt, camera, elapsed) {
    for (const s of this.signs) {
      if (s.gif) {
        // Play the decoded GIF frames using each frame's own delay.
        s.gifTime += dt * 1000;
        const t = s.gifTime % s.gif.totalDelay;
        const cum = s.gif.cumulative;
        let idx = 0;
        for (let k = 0; k < cum.length; k++) if (t >= cum[k]) idx = k;
        if (idx !== s.gifIndex) {
          s.gifIndex = idx;
          s.picMat.map = s.gif.textures[idx];
          s.picMat.needsUpdate = true;
        }
      } else if (s.video) {
        // VideoTexture: just keep it fresh (covers browsers without rVFC).
        if (s.videoTex && s.video.readyState >= 2) s.videoTex.needsUpdate = true;
      } else {
        // advance built-in flipbook
        s.t += dt * s.fps;
        const f = Math.floor(s.t) % FRAMES;
        if (f !== s.frame) {
          s.frame = f;
          s.picMat.map = s.frames[f];
          s.picMat.needsUpdate = true;
        }
      }
      // gentle bob + billboard toward camera
      s.pivot.position.y = s.baseY + Math.sin(elapsed * 1.5 + s.bobPhase) * 0.25;
      const sx = s.pivot.parent.position.x;
      const sz = s.pivot.parent.position.z;
      s.pivot.rotation.y = Math.atan2(camera.position.x - sx, camera.position.z - sz);
    }
  }
}

// Fetch an animated image (gif / webp / apng / png) and decode every frame into
// an array of THREE textures + per-frame delays. GIFs go through gifuct; other
// formats use the browser's ImageDecoder (animated WebP/APNG), falling back to a
// single static frame when ImageDecoder isn't available.
async function loadAnimatedImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const type = (res.headers.get('content-type') || guessType(url)).split(';')[0];
  const buf = await res.arrayBuffer();

  if (type === 'image/gif' || /\.gif($|\?)/i.test(url)) return decodeGif(buf);
  if (typeof ImageDecoder !== 'undefined') {
    try {
      return await decodeWithImageDecoder(buf, type);
    } catch (e) {
      return await staticTexture(buf, type);
    }
  }
  return staticTexture(buf, type);
}

function guessType(url) {
  if (/\.webp($|\?)/i.test(url)) return 'image/webp';
  if (/\.png($|\?)/i.test(url)) return 'image/png';
  if (/\.gif($|\?)/i.test(url)) return 'image/gif';
  return 'image/webp';
}

// Decode animated WebP / APNG via the WebCodecs ImageDecoder API.
async function decodeWithImageDecoder(buf, type) {
  const dec = new ImageDecoder({ data: buf, type });
  await dec.tracks.ready;
  const track = dec.tracks.selectedTrack;
  let count = track && track.frameCount ? track.frameCount : 1;

  const textures = [];
  const delays = [];
  let w = 0;
  let h = 0;

  for (let i = 0; i < count; i++) {
    let result;
    try {
      result = await dec.decode({ frameIndex: i, completeFramesOnly: true });
    } catch {
      break;
    }
    const frame = result.image; // VideoFrame
    w = frame.displayWidth;
    h = frame.displayHeight;
    textures.push(texFromSource(frame, w, h));
    // VideoFrame.duration is in microseconds.
    delays.push(Math.max(20, frame.duration ? frame.duration / 1000 : 100));
    frame.close();
    if (track && track.frameCount && track.frameCount > count) count = track.frameCount;
  }
  if (dec.close) dec.close();
  if (!textures.length) throw new Error('no frames');
  return pack(textures, delays, w, h);
}

// Single static frame fallback (no animation, but the image still shows).
async function staticTexture(buf, type) {
  const bmp = await createImageBitmap(new Blob([buf], { type }));
  const tex = texFromSource(bmp, bmp.width, bmp.height);
  return pack([tex], [100], bmp.width, bmp.height);
}

// Draw a frame source (VideoFrame / ImageBitmap / canvas) to a CanvasTexture,
// downscaled so the longest side is at most MAX_TEX (signs are small on screen).
const MAX_TEX = 160;
function texFromSource(src, w, h) {
  const scale = Math.min(1, MAX_TEX / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  canvas.getContext('2d').drawImage(src, 0, 0, cw, ch);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function pack(textures, delays, width, height) {
  const cumulative = [];
  let acc = 0;
  for (const d of delays) {
    cumulative.push(acc);
    acc += d;
  }
  return { textures, delays, cumulative, totalDelay: acc, width, height };
}

// Decode a GIF buffer: composite each frame (honoring disposal) into textures.
function decodeGif(buf) {
  const gif = parseGIF(buf);
  const frames = decompressFrames(gif, true);
  if (!frames.length) throw new Error('no frames');

  const w = gif.lsd.width;
  const h = gif.lsd.height;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // scratch canvas for each frame's patch
  const patchCanvas = document.createElement('canvas');
  const patchCtx = patchCanvas.getContext('2d');

  const textures = [];
  const delays = [];
  let saved = null;

  for (const frame of frames) {
    const { dims, disposalType } = frame;

    if (disposalType === 3) saved = ctx.getImageData(0, 0, w, h);

    patchCanvas.width = dims.width;
    patchCanvas.height = dims.height;
    patchCtx.putImageData(
      new ImageData(frame.patch, dims.width, dims.height),
      0, 0
    );
    ctx.drawImage(patchCanvas, dims.left, dims.top);

    // Snapshot this composited frame into its own (size-capped) texture.
    textures.push(texFromSource(canvas, w, h));
    delays.push(Math.max(20, (frame.delay || 10) * 10)); // GIF delay is in 1/100s

    if (disposalType === 2) ctx.clearRect(dims.left, dims.top, dims.width, dims.height);
    else if (disposalType === 3 && saved) ctx.putImageData(saved, 0, 0);
  }

  // Precompute cumulative start times for quick lookup during playback.
  const cumulative = [];
  let acc = 0;
  for (const d of delays) {
    cumulative.push(acc);
    acc += d;
  }

  return { textures, delays, cumulative, totalDelay: acc, width: w, height: h };
}

function makeSpecks(n) {
  const specks = [];
  const hues = [330, 50, 200, 280, 140];
  for (let i = 0; i < n; i++) {
    specks.push({
      x: Math.random(),
      y0: Math.random(),
      size: 4 + Math.random() * 6,
      speed: 0.5 + Math.random() * 1.2,
      hue: hues[(Math.random() * hues.length) | 0],
      rot: Math.random() * Math.PI,
    });
  }
  return specks;
}

function buildFrames(style, specks) {
  const frames = [];
  const S = 256;
  for (let f = 0; f < FRAMES; f++) {
    const ph = f / FRAMES;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');

    // Pulsing pastel background card.
    const light = 78 + Math.sin(ph * Math.PI * 2) * 6;
    ctx.fillStyle = `hsl(${style.hue}, 80%, ${light}%)`;
    roundRect(ctx, 6, 6, S - 12, S - 12, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(58,53,80,0.5)';
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 10]);
    roundRect(ctx, 18, 18, S - 36, S - 36, 16);
    ctx.stroke();
    ctx.setLineDash([]);

    // Confetti drifting downward.
    for (const sp of specks) {
      const y = (((sp.y0 + ph * sp.speed) % 1) + 1) % 1;
      ctx.save();
      ctx.translate(sp.x * (S - 40) + 20, y * (S - 40) + 20);
      ctx.rotate(sp.rot + ph * Math.PI * 2);
      ctx.fillStyle = `hsl(${sp.hue}, 85%, 60%)`;
      ctx.fillRect(-sp.size / 2, -sp.size / 2, sp.size, sp.size * 0.6);
      ctx.restore();
    }

    // Bouncing emoji.
    const bob = Math.sin(ph * Math.PI * 2) * 12;
    const scale = 1 + Math.sin(ph * Math.PI * 2) * 0.1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${Math.round(104 * scale)}px serif`;
    ctx.fillText(style.emoji, S / 2, 112 + bob);

    // Caption.
    ctx.fillStyle = '#3a3550';
    ctx.font = 'bold 30px Trebuchet MS, sans-serif';
    ctx.fillText(style.text, S / 2, 212);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    frames.push(tex);
  }
  return frames;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
