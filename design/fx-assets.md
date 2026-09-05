# Combat VFX assets

Generated with the built-in image_gen tool on 2026-09-05. Original outputs remain in the Codex generated_images directory; project copies preserve their original alpha channels.

## impact.png

- Path: `public/assets/impact.png`
- Format: 1254 × 1254 PNG, RGBA
- Usage: gun hit / critical hit `THREE.Sprite`, additive blending, depth write disabled. Scale and fade over a short lifetime. Tint white for the native warm ivory/gold palette.
- Visual inspection: bright central core, long directional spark rays, thin glowing fragments, no environment or text.
- Alpha check: top-left alpha 0; center alpha 253.
- Prompt:

> Use case: stylized-concept. Asset type: production videogame VFX sprite texture, square 1024x1024. Primary request: one isolated bright ivory-gold gun impact sparkle, a compact brilliant warm-white core with 8 sharp radiating elongated gold sparks of varied length, subtle amber glowing wisps, a few tiny spark fragments immediately around the core. Composition: centered, radial, all visible rays contained inside generous 12% empty margins. Style: polished hand-painted 3D action roguelite VFX with crisp cinematic luminous shapes and restrained soft glow. Background: genuinely transparent alpha, no ground, no environment. This will be drawn as a THREE.Sprite with additive blending; only luminous particles, no colored rectangular background. Constraints: no text, no watermark, no objects, no gun, no characters, no vignette, no checkerboard pattern. Output a standalone transparent PNG sprite.

## arcane-ring.png

- Path: `public/assets/arcane-ring.png`
- Format: 1254 × 1254 PNG, RGBA
- Usage: nova / reward ground plane, additive blending, depth write disabled. Rotate slowly and animate opacity/scale; keep elevated slightly above the floor to avoid z-fighting.
- Visual inspection: top-down luminous turquoise and gold ring, abstract rune-like marks, transparent central opening, no environment or readable text. Outer cardinal ornaments reach the texture edge, so avoid cropping in code.
- Alpha check: top-left alpha 0; center alpha 0.
- Prompt:

> Use case: stylized-concept. Asset type: production videogame magical ground VFX texture, square 1024x1024. Primary request: one top-down magical turquoise and warm-gold circular glyph ring, elegant gothic rune-like ABSTRACT NON-LANGUAGE marks distributed around two very thin concentric luminous circles, inner and outer rings interrupted with delicate angular geometric accents. Style: polished dark-fantasy action roguelite spell effect, crisp bright narrow turquoise lines with a few restrained gold accents and subtle glow. Composition: perfectly flat top-down orthographic circle, centered, diameter 80% of image. Central 60% of ring is completely empty and transparent, no central sigil or drawing. Background: genuinely transparent alpha everywhere around and inside the ring. This will render on a ground plane with additive blending. Constraints: no readable letters or text, no watermark, no environment, no perspective, no floor, no vignette, no checkerboard. Output a standalone transparent PNG texture.

