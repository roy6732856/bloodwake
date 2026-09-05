# Bloodwake v0.5 lobby concept

## Runtime hunter portrait

Asset: `public/assets/hunter-v05.png`. Built-in Image Gen with lobby concept as visual reference. Generated portrait retains mask, crimson scarf and bronze-edged armor identity.

Final backdrop: solid deep ink with subtle crimson rim haze. First transparency request generated an RGB checkerboard, so a built-in edit replaced the background while preserving the exact character. Final edit prompt: Replace every light gray/white checkerboard square with dark ink #080c14, subtle crimson haze at shoulder edges; preserve character mask, eyes, scarf, armor, silhouette, composition and dimensions; no checkerboard, text, UI or watermark.

Prompt: Use case: stylized-concept. Asset: single square transparent-background game character selection portrait. Use attached Bloodwake lobby concept only as character identity/style reference; create a NEW standalone chest-up bust portrait of its crimson ASHEN HUNTER hero. A gunmetal angular closed knight mask with narrow crimson glowing eye slits, elongated central helmet crest, layered bronze-edged sharp pauldrons, dark armor, bloodred woven scarf and cape folds. No skin visible. Strong premium sculpted stylized 3D materials: brushed dark steel, worn warm bronze bevels, rough woven crimson cloth. Three-quarter view, head turns slightly toward viewer, striking silhouette completely in frame including helmet crest and shoulders. Dramatic soft silver key and crimson rim lighting, clean readable details at small card size. Background genuinely transparent alpha, no scenery, no text, no UI, no logos, no border, no watermark. Center composition occupies about 85% of square canvas. Preserve the reference's knight mask identity and crimson palette.

Generated with built-in Image Gen. Concept art reference, not a runtime screen or sprite.

## Prompt

Use case: ui-mockup
Asset type: full primary screen concept for Bloodwake game character selection lobby, desktop landscape 16:9.
Primary request: A polished modern realtime stylized 3D gothic sci-fantasy vampire hunting game lobby. Strong designed sculpted shapes rather than cubes, not photorealistic. Main hero occupies central 45 percent of the screen: full body crimson armored masked gunslinger with sculpted dark brushed steel armor, warm gold edges, deep red long layered cape, small crimson eye slit, two arcane pistols, believable heroic stylized proportions, on an engraved circular obsidian pedestal. Materials must visibly differ: metal reflected edges, woven cloak folds, luminous crystal insets, cut stone. Restrained mist and particles.
Scene/backdrop: layered ruined gothic pointed arches fading into blue-black darkness, huge soft crimson moon/halo behind hero, luminous red engraved concentric pedestal rings.
Composition: beautiful complete playable screen with usable negative space. Left 25 percent has elegant large Traditional Chinese title 灰燼獵人, small subtitle THE ASHEN HUNTER, brief 2-line lore, two compact ability panels. Top thin understated nav has BLOODWAKE left, resources and utility controls right. Right 22 percent narrow floating controls for four palette swatches under 配色, two exciting skill preview mini tiles under 技能試映, small audio waveform with play button under 主題音樂. Bottom horizontal three character portrait selectors: crimson gunslinger 灰燼獵人 selected, violet hooded agile dagger hunter 緋影遊俠, teal ornate crowned eclipse oracle 月蝕使徒 with floating crescent. Bottom right wide muted gold button 踏入獵場 and small 配裝與試煉 control.
Style: premium authored art direction, readable restrained UI, modern warm ivory typography with large elegant Chinese character heading, thin gold rules, wide spacing, physical character is focal point. Plausible high quality Three.js real-time rendering using smooth helmet, layered armor, cloth and crescent shapes rather than impossibly ornate illustration.
Colors: ink #080c14, cool slate #16202d, muted antique gold #c2a66b, crimson #d24c58, ivory #f0e5cc. No bright white cards, no clutter, no browser frame, no promotional slogans, no watermark.

## Implementation direction

Fullbody hero is the focal point with readable sculpted helmet and separate metallic armor, cloth cape, illuminated crystal and carved stone surfaces. Three columns frame a deep circular 3D stage. Ivory display typography and fine muted gold rules sit over ink-black negative space. Crimson halo and shallow mist give depth; violet and teal variants have distinct silhouettes. Bottom roster shows all three characters. Color and effects controls are direct previews; audio requires an explicit play gesture. Text and ornamental details in this concept are visual references and should be implemented as real UI with actual game ability descriptions. The highly ornate painted trim is aspirational, while the implementation should prioritize actual rotatable 3D form, material contrast, lighting and interaction.
