# journey/threejs-view

`<app-threejs-view [collectionsData] [viewType]>`: 3D tab of the journey editor. Shows three textured Berlin city tiles (OBJ/MTL from `assets/threejs-city-data`, source: Berlin 3D download portal) and, for every data file of every collection, a coloured disc plus a translucent vertical beam at its position.

- `convertCoordinates(lon, lat)` maps WGS84 coordinates linearly onto the scene (origin ≈ 13.32797° E / 52.51309° N, 214 scene units ≈ width of one tile).
- `loadRenderer()` (called when the tab is opened) creates the `WebGLRenderer` + `OrbitControls` on first use, loads the tiles once, sizes the canvas (16:9, or 21:9 in the `no-map` view) and starts the render loop; `unloadRenderer()` stops it.
- `OrbitControls`, `OBJLoader`, `MTLLoader` are imported from `three/addons/...` (the former `three-orbitcontrols` package was dropped).

Gotchas:

- The renderer is created lazily, so no WebGL context is requested until the tab is used (also makes the component testable in jsdom).
- Data files without `content.location` would break the scene update (`location!`).
- The canvas is appended to the first `.threejs-renderer` element in the document.
