# Cinematic Inauguration Experience — Harish-Chandra Research Centre

A ceremonial, interactive digital inauguration experience built for the **Harish-Chandra Research Centre, School of Basic Sciences, CSJMU Kanpur, in collaboration with IIT Kanpur**.

---

## Architecture & File Structure

```text
HRC-SBS/
├── assets/
│   ├── images/
│   │   └── harish-chandra.webp
│   └── logo/
│       ├── csjmu.png
│       ├── hrc-logo.png
│       └── iitk.png
├── css/
├── js/
├── admin/
├── index.html (Existing main website - untouched)
└── inauguration/
    ├── index.html
    ├── css/
    │   └── inauguration.css
    ├── js/
    │   └── inauguration.js
    └── assets/
        ├── images/
        └── logo/
            ├── csjmu.png
            ├── hrc-logo.png
            └── iitk.png
```

---

## Five Ceremonial Stages

1. **Stage A — The Arrival**:
   - Deep navy velvet curtains (`#0B1F33`) with realistic 3D accordion fold ridges and gold bullion fringe.
   - Central light slit with a warm golden beam spilling out onto the stage floor.
   - Subtle floating ambient golden dust particles on high-DPI HTML5 canvas.
   - Understated "OFFICIAL INAUGURATION" label and preview branding.
   - Red ceremonial satin ribbon taut across the stage.

2. **Stage B — The Invitation**:
   - Prominent ceremonial CTA button: **INAUGURATE &rarr;**
   - Subtext: *“Click to begin a new chapter”*
   - Accessible via Mouse, Keyboard (Enter / Space), and Touchscreen.

3. **Stage C — The Curtains Open**:
   - Curtains part smoothly with realistic drapery bunching physics.
   - Spotlights sweep and illuminate the central dais.
   - Stage lighting brightens smoothly.
   - Official institutional crests and branding hierarchy are revealed.
   - Web Audio API procedural orchestral swell (no external audio files required).

4. **Stage D — The Ribbon-Cutting Ceremony**:
   - Golden ceremonial vector scissors engage at the ribbon center.
   - Blades snip shut with deliberate precision and crisp metallic sound.
   - Center rosette flares in a golden light burst.
   - Red satin ribbon separates into left and right halves, swaying naturally downward.
   - A restrained, tasteful shower of 110+ shimmering gold, champagne, and ruby confetti flakes cascades down with physics (gravity, drag, wobble).

5. **Stage E — The Final Welcome**:
   - **WELCOME TO THE HARISH-CHANDRA RESEARCH CENTRE**
   - Tagline: *“A space for ideas to grow.”*
   - Supporting line: *“A centre for research, dialogue, education, and academic community.”*
   - Golden call-to-action button: **ENTER THE CENTRE &rarr;** linking to `https://hrc-sbs.vercel.app/`.
   - Accessible "Replay Ceremony" button to repeat the experience.

---

## How to Run Locally

### Option 1: As part of the HRC-SBS website
Serve from the root of `HRC-SBS`:
```powershell
cd C:\Projects\HRC-SBS
python -m http.server 8000
```
Open in browser:
```
http://localhost:8000/inauguration/
```

### Option 2: Standalone
Serve directly from the `inauguration/` directory or `INAUGURAL-HRC-SBS`:
```powershell
cd C:\Projects\HRC-SBS\inauguration
python -m http.server 8080
```
Open in browser:
```
http://localhost:8080/
```

---

## Accessibility & Performance Features

- **Prefers-Reduced-Motion**: Detects user motion preferences and automatically bypasses heavy animations.
- **Skip Ceremony**: Always available via the topbar button or keyboard shortcut (`S`).
- **Sound Toggle**: Mute/Unmute toggle via button or keyboard shortcut (`M`). Silent by default, zero copyright or bandwidth overhead.
- **Pure Web Standards**: Semantic HTML5, CSS3, and Vanilla JavaScript with SVG vector graphics. Zero heavy dependencies (no React, no Three.js, no Bootstrap).
