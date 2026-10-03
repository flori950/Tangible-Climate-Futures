# map

`<app-map>` (`MapModule`, also routed stand-alone at `/map`): OpenLayers 10 map with OpenStreetMap tiles, centred on Berlin. Two modes:

1. **Location picker** (`[enableDrawFeatures]="false"`, used by the upload forms): click sets a marker, shows a coordinate popup, looks up the address (Nominatim reverse search) and emits the coordinate.
2. **Area filters** (default, used by the journey editor and the map filter dialog): draw circles (RADIUS) or polygons (AREA); each shape becomes a chip and a backend filter on `content.location`; shapes can be modified and removed. Additionally draws the points of the journey's collections.

Original author: Florian Jäger (map TCF-5, PR #66; address lookup TCF-90, PR #103).

## API

|           | Name                 | Type                             | Meaning                                       |
| --------- | -------------------- | -------------------------------- | --------------------------------------------- |
| `@Input`  | `enableDrawFeatures` | `boolean` (default `true`)       | Mode switch, see above.                       |
| `@Input`  | `presetFilters`      | `(RadiusFilter \| AreaFilter)[]` | Filters to show as shapes.                    |
| `@Input`  | `matchPresetFilters` | `boolean` (default `true`)       | Replace existing shapes when presets change.  |
| `@Input`  | `collections`        | `DisplayCollection[]`            | Points per collection with their colour.      |
| `@Output` | `filterUpdated`      | `(RadiusFilter \| AreaFilter)[]` | All current filters after draw/modify/remove. |
| `@Output` | `coordinateSelected` | `[number, number]`               | Clicked coordinate (EPSG:3857).               |

Public methods used by parents: `drawLongLatCoords(lon, lat)`, `resetMap()`.

Services: `CoordinateService` (EPSG:3857 → lon/lat, broadcast of clicked coordinates), `ApiService.geocodeAddress/getAddress` (Nominatim), `NotificationService`, `TranslateService`.

## Gotchas

- The map works in **EPSG:3857** internally; filters and emitted lon/lat values are EPSG:4326. OpenLayers circles report the radius twice as large as the drawn one, hence the `/ 2` (and `* 2` for presets); filter radii are in km.
- The map is created in `ngOnInit` (`@ViewChild('map', { static: true })`) so preset filters become chips before the first change detection; `ngOnChanges` ignores changes until then.
- The coordinate popup is found with `document.getElementById('popup')`, so only one picker-mode map should exist per page.
- Address lookups go directly from the browser to `nominatim.openstreetmap.org` (usage policy applies; no auth header is sent).
