# dashboard

Start page (`/dashboard`, lazy-loaded, requires login). `DashboardComponent` renders one `<app-dashboard-tile>` per main feature: upload (`upload-data`), view data sets (`data-sets`), journey (`journey`) and browse journeys (`browse-journeys`).

## Files

| File                          | Purpose                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard.module.ts`         | Declares `DashboardComponent`; imports `SharedModule` (tiles), Material, `TranslatePipe`.                                                            |
| `dashboard.routing-module.ts` | Single empty child route.                                                                                                                            |
| `dashboard.component.*`       | Builds the tile list (`Tile[]`, see `shared/dashboard-tile/tile.ts`) from `title.*` translations and rebuilds it on `TranslateService.onLangChange`. |

## Gotchas

- Tile titles are translated with `translate.instant()`, so they are only correct once the translation file is loaded; the `onLangChange` subscription refreshes them.
