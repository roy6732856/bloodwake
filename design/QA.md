# Bloodwake verification

Verified on 2026-09-05 in the Codex in-app browser using CUA. No Playwright fallback was needed. Browser screenshots were saved with CUA `getScreenshot` and inspected alongside `concept.png` with `view_image`.

## Functional verification

5 Node tests passed: currency purchase validation, save sanitization, unique/max-rank upgrade selection, end-of-run rewards, stat changes.

11 browser integration tests passed through `tests/browser.html`: WASD movement/bounds, grave collisions, aimed projectile kills and drops, XP pickup/three choices/resume, dash invulnerability/cooldown, nova damage/cooldown, pause, death/rewards/retry/persistent purchase, boss spawn/shockwave, victory/one-time settlement, and a 90-enemy crowd simulation. The crowd remained finite and the measured render used 1,151 draw calls in that test. This is a bounded stress check, not a hardware-wide FPS guarantee.

Manual UI checks in the in-app browser also exercised starting, automatic shooting, dash, nova, pause and death result presentation. The simulation tests accelerate time; they do not claim a full five-minute human playthrough or final difficulty balancing.

## Visual comparison ledger

Reference dimensions: 1536 × 1024. Actual gameplay and menu captured at 1536 × 1024. Also checked the app's initial 652 × 698 panel and a 390 × 844 narrow viewport. Narrow viewport reported no horizontal overflow. Temporary viewport overrides were reset and the test tab was closed.

| Point | Concept evidence | Render evidence / outcome |
|---|---|---|
| Layout | Full-bleed arena, top center timer, corner vitals | Same HUD anchors and central gameplay surface in gameplay.jpg |
| Typography | Ivory serif brand/time; Chinese utility text | Georgia branding/numerals and system Traditional Chinese controls; smaller practical HUD than cinematic reference |
| Color | Charcoal slate, gold borders, teal XP, crimson health | Preserved semantic palette; increased floor illumination and reduced excessive blue tint after first capture |
| Materials | Stone courtyard, gothic props, hunter and purple undead | Generated slate used on real 3D floor; added stone bump detail; explicit low-poly model adaptation |
| Spacing | Three separate outlined skills at bottom center | Distinct clickable silver-bullet/dash/nova slots, 34px desktop gutters; stacked placement at narrow width |
| Art blending | Dark atmosphere without unreadable labels | Bloodmoon asset integrated into menu with dark text-side overlay; no image used as an interactive UI replacement |
| Responsive layout | Concept is desktop only | Mobile menu and HUD extend same system; no overlapping health/skill/score blocks at 390px |
| Copy | BLOODWAKE, 血月獵場, 存活至 05:00, 暫停, 音效, 銀彈, 衝刺, 新星, 擊殺, LV | Core concept strings preserved. Intentional additions: control hints, cooldowns, auto-fire state, encounter alerts, start/help/legacy/upgrade/results copy required by the playable game. Counters reflect actual state |

The implementation was compared directly against the concept for layout, palette, typography, assets, and spacing. It preserves the interface direction, but is intentionally **not** a pixel-identical recreation of the cinematic generated scene: actual animated low-poly meshes replace its realistic character art; gameplay has a moving orthographic camera and menu-only distant moon skyline. These material differences are documented, not represented as exact visual parity.

## Fixes and limits

- Improved slate readability and color balance; added stone bump detail.
- Disposed expired/reset ring materials and ensured hunter remains visible on ending a run.
- Fixed early texture update warnings by loading the bump texture normally rather than marking an unloaded clone for upload.
- All gameplay images and the pinned Three.js dependency are local assets; no runtime API key is needed.
- Browser instrumentation once emitted a MutationObserver error without an application source while navigating the QA iframe. No application code uses MutationObserver. Gameplay integration tests completed despite that instrumentation message.
- Mobile viewport layout verified; physical multi-touch hardware and a representative range of phones have not been tested.
- Single arena prototype; gamepad, multiplayer, full skeletal animations, cloud saves and production difficulty balancing are not included.

Retained screenshots: gameplay.jpg, menu.jpg, mobile-gameplay.jpg, mobile-menu.jpg. These are visual deliverables, not application dependencies. Reproducible test source is retained in tests/.
