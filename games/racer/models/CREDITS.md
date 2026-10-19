# Highway Rush 3D assets

| File | Contents | Source | License |
|---|---|---|---|
| `cars.glb` | sedan-sports (player), sedan, hatchback-sports, suv, suv-luxury, van, taxi, truck, delivery, truck-flat | [Kenney Car Kit 3.1](https://kenney.nl/assets/car-kit) by Kenney (www.kenney.nl) | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) |
| `nature.glb` | tree_palmDetailedTall, tree_palmDetailedShort, tree_palmBend, stone_largeA, stone_largeC, plant_bushDetailed, grass_leafsLarge | [Kenney Nature Kit 2.1](https://kenney.nl/assets/nature-kit) by Kenney (www.kenney.nl) | [CC0 1.0](http://creativecommons.org/publicdomain/zero/1.0/) |
| `../lib/three-racer.js` | three.js r186 subset + GLTFLoader + RoomEnvironment, bundled/minified with esbuild (see `../lib/vendor-entry.js`) | [three.js](https://threejs.org) | MIT (`../lib/LICENSE-three.txt`) |

The GLB files were merged, de-duplicated and quantized (KHR_mesh_quantization) with glTF-Transform; geometry is otherwise unchanged.
In the game, car paint is split out of the Kenney colour atlas and replaced with a clearcoat material; nature models are recoloured.
Asphalt, grass, gravel, sky and sign textures are generated in code at runtime. Thanks, Kenney!
