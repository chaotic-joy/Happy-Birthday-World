// Central tunables for the game. Tweak freely — everything cute lives here.
import * as THREE from 'three';

export const COLORS = {
  sky: 0xcdeafe,
  fog: 0xdfeafe,
  ground: 0xa8d5a2,
  groundDark: 0x96c890,
  asphalt: 0x4a4a55,
  kerbA: 0xff6b8a,
  kerbB: 0xfff6e9,
  carBody: 0xff8fb1,
  carAccent: 0xb58cff,
  carNose: 0xfff6e9,
  tree: 0x6fc27a,
  treeTrunk: 0x9b6a4a,
  boost: 0x7fdfd4,
  textA: 0xff8fb1,
  textB: 0xb58cff,
};

// Night-time scene palette.
export const NIGHT = {
  sky: 0x0b1026,
  fog: 0x141a3a,
  moon: 0xbcd0ff,
  star: 0xffffff,
};

// UnrealBloom post-processing — gives the fireworks/candles/neon their glow.
export const BLOOM = {
  strength: 0.55,
  radius: 0.4,
  threshold: 0.85,
};

// Local animated GIFs. Drop .gif files in public/gifs/ and they'll be decoded
// and played on the signs (this takes priority over Giphy and the built-in
// signs). Either name them 1.gif, 2.gif, … or list filenames in
// public/gifs/manifest.json (e.g. ["clark.gif","cake.gif"]).
export const GIFS = {
  folder: './gifs/',
  max: 24, // highest numbered file to probe for (1.gif … 24.gif)
};

// Animated birthday GIFs from Giphy. Paste a free key from
// https://developers.giphy.com to pull real birthday gifs (played as MP4 video
// textures). Leave blank to use the built-in animated party signs instead.
export const GIPHY = {
  apiKey: '',
  tag: 'happy birthday',
  count: 30,
  rating: 'g',
};

// --- Car arcade physics ---
export const CAR = {
  accel: 26, // units/s^2 when pressing up
  brake: 40, // units/s^2 when pressing down while moving forward
  reverseAccel: 14,
  maxSpeed: 34, // forward speed cap (normal)
  maxReverse: 10,
  friction: 12, // passive decel when no throttle
  steer: 1.9, // base turn rate (rad/s) scaled by speed factor
  bodyLean: 0.22, // visual roll into corners
  wheelRadius: 0.55,
};

// --- Boost ---
export const BOOST = {
  duration: 3, // seconds of boost
  cooldown: 2.5, // seconds before it can be used again
  speedMult: 1.8, // max-speed multiplier while boosting
  accelMult: 2.2, // acceleration multiplier while boosting
  fov: { normal: 60, boost: 78 }, // camera FOV ease
};

export const PLACEHOLDER_COUNT = 12;

// Path to the celebration sound that plays when the lights go out.
// Drop your file at: public/sounds/start.mp3
export const SOUND_FILE = './sounds/start.mp3';

// Winding closed circuit — control points on the XZ plane (y = 0).
// Kept smooth and loopy for a lofi feel. Units are world units.
export const TRACK_POINTS = [
  [0, 0, -60],
  [48, 0, -52],
  [70, 0, -10],
  [52, 0, 30],
  [70, 0, 64],
  [40, 0, 86],
  [-6, 0, 78],
  [-30, 0, 50],
  [-70, 0, 58],
  [-86, 0, 16],
  [-58, 0, -22],
  [-66, 0, -64],
  [-28, 0, -84],
  [-30, 0, -40],
].map((p) => new THREE.Vector3(p[0], p[1], p[2]));

export const ROAD_WIDTH = 9;
