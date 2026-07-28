# VDJ SKIN WYSIWYG PREVIEW SIMULATOR

<p align="center">
    <img src="images/VISUALdj.png" alt="Visual DJ" width="250" height="250">
</p>

## Description
A browser-based visual simulator for Virtual DJ skin design. Parses real VDJ Skin SDK XML files and renders them as HTML/CSS, giving WYSIWYG previews of skin layouts. Powered by a custom VDJ XML parser that resolves skin defines, placeholders, colors, and coordinate math expressions.

## Directory Structure
```
VDJ_Skin_WebSimulator/
├── server.js              ← Node.js HTTP server (listens on 127.0.0.1:3000)
├── package.json
├── index.html             ← Main entry point with skin selector
├── scripts/
│   ├── vdj-parser.js      ← VDJ Skin XML parser (defines, placeholders, colors, math)
│   └── vdj-renderer.js    ← DOM renderer (converts parsed skin to HTML/CSS)
├── skins/Default/         ← VirtualDJ Default skin (5 layouts)
│   ├── Pro.xml (960 elements)
│   ├── Essentials.xml (235 elements)
│   ├── Performance.xml
│   ├── Starter.xml
│   ├── Vertical.xml
│   └── *.png (graphics)
├── styles/
│   └── style.css
└── images/
```

## Quick Start
```bash
npm start
# → http://127.0.0.1:3000
```

Or with auto-reload:
```bash
npm run dev
```

## Supported Skin Features

| Feature | Status |
|---------|--------|
| Vector buttons (shape/color/gradient/radius) | ✅ |
| Image-based buttons (sprite coordinates) | ✅ |
| Text overlays (format, action labels) | ✅ |
| Visual elements (static & colored) | ✅ |
| Sliders & faders | ✅ |
| Line/Square/Circle shapes | ✅ |
| Song position (waveform placeholder) | ✅ |
| Browser (folder/file list placeholder) | ✅ |
| Video preview (placeholder) | ✅ |
| Album cover (placeholder) | ✅ |
| Logo | ✅ |
| Group/Panel/Deck containers | ✅ |
| Class defines with placeholders | ✅ |
| Color defines | ✅ |
| Relative positioning & math | ✅ |
| VDJ Script execution | ❌ (static rendering only) |
| Icon/image sprites from skin PNG | ⚠️ (coordinates parsed, image rendering partial) |
| Animations & state changes | ⚠️ (static state only) |

## How It Works

1. **Parser** (`vdj-parser.js`): Reads VDJ Skin XML, resolves `<define>` classes, color defines, placeholder variables, coordinate math expressions, and nested container positions.
2. **Renderer** (`vdj-renderer.js`): Converts parsed elements into absolutely-positioned DOM elements with CSS styling.
3. **Scale & Pan**: Toolbar slider scales the 1920×1080 skin to fit any viewport.

## Adding Your Own Skin
Place your `.xml` and `.png` files in a subdirectory under `skins/`, then add entries to the `SKINS` array in `index.html`.

## Disclaimer
This project is not affiliated with, sponsored by, or endorsed by Virtual DJ / Atomix Productions. It is a community contribution for skin designers.

---
