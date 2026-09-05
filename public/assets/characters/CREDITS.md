# Character asset credits

Original character meshes, outfits, hairstyles, textures, humanoid rigs, and
animation clips are by **Quaternius**. These assets come from the free Standard
releases, distributed under **CC0 1.0 Universal (Public Domain Dedication)**:
https://creativecommons.org/publicdomain/zero/1.0/

## Primary artist sources

- Modular Character Outfits - Fantasy: https://quaternius.com/packs/modularcharacteroutfitsfantasy.html
- Universal Base Characters (including hairstyles): https://quaternius.com/packs/universalbasecharacters.html
- Universal Animation Library: https://quaternius.com/packs/universalanimationlibrary.html
- Universal Animation Library 2: https://quaternius.com/packs/universalanimationlibrary2.html

Support the artist: https://www.patreon.com/quaternius

## Download mirrors used

The following public repositories supplied copies of the Quaternius exports;
they are download provenance, not the original authors of the artwork:

- https://github.com/agentkaerf/FreeModels/tree/main/Modular%20Character%20Outfits%20-%20Fantasy%5BStandard%5D
  - `Exports/glTF (Godot-Unreal)/Outfits/`: Male_Ranger, Female_Ranger,
    Male_Peasant and outfit/skin textures.
- https://github.com/agentkaerf/FreeModels/tree/main/Universal%20Animation%20Library%202%5BStandard%5D
  - `Unreal-Godot/UAL2_Standard.glb`.
- https://github.com/lord3nd3r/ffxi-browser/tree/main/public/models/chars
  - Superhero_Male_FullBody, Superhero_Female_FullBody, head/eye/hair textures,
    and animation exports used in preparation.
- https://github.com/lord3nd3r/ffxi-browser/tree/main/public/models/chars/hair
  - Hair_SimpleParted and Hair_Long.

## Bloodwake processing

Bloodwake prepares these existing artist-made assets for browser delivery:
textures are resized to a maximum of 1024 pixels and encoded as JPEG, unused
vertex attributes and unavailable texture references are removed, and some
binary buffers are compacted. Selected animation tracks are extracted for
runtime use. Base-body exports remain complete in this directory; head cropping,
outfit selection, tinting, attachment, and animation retargeting are performed
downstream by the game's character integration. These modifications do not imply
that Bloodwake authored the original meshes or textures.
