/** A navigation tile as rendered by DashboardTileComponent. */
export interface Tile {
  title: string;
  /** Material icon ligature name, e.g. "upload". */
  icon: string;
  /** Router path the tile navigates to. */
  url: string;
}
