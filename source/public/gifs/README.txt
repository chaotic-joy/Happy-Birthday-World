Animated signs around the track play the files in this folder.

Supported: animated .webp (decoded via the browser's ImageDecoder) and .gif.

Choosing which files are used:
1) manifest.json (used here): a JSON array of filenames, in display order, e.g.
   ["hbd.webp","hbd2.webp", ...]. Edit it to add/remove/reorder.
2) Or delete manifest.json and name files 1.gif/1.webp, 2..., consecutively.

Clark's 10 animated webp birthday gifs are already included (hbd*.webp) and listed
in manifest.json. Replace them with your own anytime.

Frames are downscaled to ~220px when decoded to keep GPU memory reasonable
(see MAX_TEX in src/gifs.js). Empty folder -> built-in animated party signs.

If you deploy the prebuilt /dist by drag-and-drop, these files are already copied
into dist/gifs/ by the build.
