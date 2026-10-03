import { expect, describe, it } from "@jest/globals";
import { parsePath, toPointLocation } from "../../src/utils/utils";
import { parseBooleanFlag } from "../../src/config/config";

describe("utils.parsePath", () => {
  it("converts array indices to dot notation", () => {
    expect(parsePath("foo.bar[0]")).toBe("foo.bar.0");
    expect(parsePath("a[1][23].b")).toBe("a.1.23.b");
    expect(parsePath("plain.path")).toBe("plain.path");
  });
});

describe("utils.toPointLocation", () => {
  it("builds a GeoJSON point from strings or numbers", () => {
    expect(toPointLocation("13.4", "52.5")).toEqual({
      type: "Point",
      coordinates: [13.4, 52.5],
    });
    expect(toPointLocation(0, 0)).toEqual({
      type: "Point",
      coordinates: [0, 0],
    });
  });

  it.each([
    [undefined, "1"],
    ["1", undefined],
    ["", "1"],
    ["1", ""],
    [null, 1],
    ["abc", "1"],
  ])("returns undefined for missing/invalid values (%p, %p)", (lon, lat) => {
    expect(toPointLocation(lon, lat)).toBeUndefined();
  });
});

describe("config.parseBooleanFlag", () => {
  it("is true only for an explicit 'true'", () => {
    expect(parseBooleanFlag("true")).toBe(true);
    expect(parseBooleanFlag(" TRUE ")).toBe(true);
    expect(parseBooleanFlag(undefined)).toBe(false);
    expect(parseBooleanFlag("")).toBe(false);
    expect(parseBooleanFlag("false")).toBe(false);
    expect(parseBooleanFlag("1")).toBe(false);
    expect(parseBooleanFlag("yes")).toBe(false);
  });
});
