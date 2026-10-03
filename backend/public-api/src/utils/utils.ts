import type { Location } from "../../../../common/types";

// Parses path like "foo.bar[0]" into "foo.bar.0"
export const parsePath = (path: string): string => {
  return path.replace(/\[(\d+)\]/g, ".$1");
};

/**
 * Builds a GeoJSON point from (string or number) longitude/latitude values.
 * Returns `undefined` if one of the values is missing, not a finite number or out of
 * range (|lon| > 180, |lat| > 90),
 * so that datapoints without coordinates are stored without a location
 * instead of with a bogus [0, 0] / [NaN, NaN] point.
 */
export const toPointLocation = (
  lon: unknown,
  lat: unknown,
): Location | undefined => {
  if (lon === undefined || lon === null || lon === "") return undefined;
  if (lat === undefined || lat === null || lat === "") return undefined;
  const lonNumber = Number(lon);
  const latNumber = Number(lat);
  if (
    !Number.isFinite(lonNumber) ||
    !Number.isFinite(latNumber) ||
    Math.abs(lonNumber) > 180 ||
    Math.abs(latNumber) > 90
  ) {
    return undefined;
  }
  return { type: "Point", coordinates: [lonNumber, latNumber] };
};
