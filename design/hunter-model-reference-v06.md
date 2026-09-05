# Ashen Hunter modeling reference — v0.6

Generated with built-in Image Gen. Final image: `design/hunter-model-reference-v06.png` (1536 × 1024 PNG).

## Exact prompt

Use case: stylized-concept. Asset type: 3D character modeling reference sheet for Bloodwake. Create ONE landscape sheet with three clean full-body views of the SAME original Ashen Hunter: front, three-quarter, and side, evenly spaced on a neutral charcoal studio backdrop. Premium stylized dark gothic game character, adult human seven-head proportions, long tapered legs, fitted leather torso under overlapping THIN gothic bronze-edged steel plates. SMALL angular closed steel helmet sized realistically to adult shoulders, narrow red glowing eye slits, no giant spike antenna and no oversized round robot head. Layered curved shoulder pauldrons of modest size. Anatomically bent elbows and gloved five-finger hands holding two slim silver pistols pointed forward and slightly down at a relaxed alert angle. Long split cloth coat and muted crimson shoulder cape, cloth drapes with visible seams and hem, believable boots with flat soles rather than spheres. Readable weathered steel, dark teal leather, muted crimson woven textile, antique gold seams and trims. Character is slim athletic adult, proportional hand and feet size, polished sculptural 3D render, clear silhouette and limb segmentation useful for modeling. Feet fully visible, margin around all heads and feet. Consistent character identity and equipment in all views. No labels, text, UI, watermark, extra objects, perspective frame, checkerboard.

## Inspection

Three full-body views match in outfit, proportions and equipment: frontal, three-quarter, side. The small angular helmet, fitted torso, thin layered pauldrons, long tapered legs, flat boot soles, split coat and asymmetric red shoulder cape directly address the oversized primitive silhouette. Antique gold edges read against dark teal leather and steel plates. Entire heads and feet remain visible. No text/UI/checkerboard. Weapons are held downward in a relaxed alert pose; elbows are slightly bent, hands have readable separated glove fingers. This is a modeling target, not a claim that the runtime mesh already has this level of sculpted detail.
## Implemented 3D rig

The reference informed adult proportions and coherent garment layers rather than an exact mesh reconstruction. `src/hunter-model.js` uses a shared procedural rig in lobby and combat: hip-height legs, tapered sleeves/greaves, elbow bend, individually modeled glove fingers, shaped boot soles, curved plate surfaces, ridged segmented helmet, collar/lapels and folded coat panels. Role-specific groups add a hood, ceremonial crown, reagent pack or ice shield. Assets remain original runtime geometry; no third-party GLB or skeletal animation package was added.

Actual renders were inspected for all five roles at desktop size and for the sentinel at 390px viewport width. QA artifacts live outside the repository. This remains stylized procedural character work, not the same detail level as the generated concept illustration.
