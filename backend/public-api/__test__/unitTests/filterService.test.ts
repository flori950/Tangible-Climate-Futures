import { expect, describe, it } from "@jest/globals";
import { Types } from "mongoose";
import {
  createBasicFilterQuery,
  createConcatenationFilterQuery,
} from "../../src/services/filter/filter.service";
import {
  BooleanOperation,
  ConcatenationFilter,
  Filter,
  FilterOperations,
} from "../../../../common/types";
import {
  OperationNotSupportedError,
  WrongObjectTypeError,
} from "../../src/errors";

const filter = (f: Record<string, unknown>) => f as unknown as Filter;

describe("filter.service createBasicFilterQuery", () => {
  it.each([
    [FilterOperations.EQ, "$eq"],
    [FilterOperations.GT, "$gt"],
    [FilterOperations.GTE, "$gte"],
    [FilterOperations.LT, "$lt"],
    [FilterOperations.LTE, "$lte"],
  ])("creates a %s number query", (operation, mongoOperator) => {
    expect(
      createBasicFilterQuery(
        filter({ key: "content.data.n", operation, value: 5, negate: false }),
      ),
    ).toEqual({ "content.data.n": { [mongoOperator]: 5 } });
  });

  it("wraps negated number queries in $not", () => {
    expect(
      createBasicFilterQuery(
        filter({ key: "n", operation: "GT", value: 1, negate: true }),
      ),
    ).toEqual({ n: { $not: { $gt: 1 } } });
  });

  it("creates a boolean IS query (optionally negated)", () => {
    expect(
      createBasicFilterQuery(
        filter({ key: "b", operation: "IS", value: true, negate: false }),
      ),
    ).toEqual({ b: { $eq: true } });
    expect(
      createBasicFilterQuery(
        filter({ key: "b", operation: "IS", value: true, negate: true }),
      ),
    ).toEqual({ b: { $not: { $eq: true } } });
  });

  it("creates a case-insensitive CONTAINS regex query", () => {
    expect(
      createBasicFilterQuery(
        filter({
          key: "title",
          operation: "CONTAINS",
          value: "ca",
          negate: false,
        }),
      ),
    ).toEqual({ title: { $regex: "ca", $options: "i" } });
    expect(
      createBasicFilterQuery(
        filter({
          key: "title",
          operation: "CONTAINS",
          value: "ca",
          negate: true,
        }),
      ),
    ).toEqual({ title: { $not: { $regex: "ca", $options: "i" } } });
  });

  it("creates MATCHES queries (exact / $ne)", () => {
    expect(
      createBasicFilterQuery(
        filter({
          key: "title",
          operation: "MATCHES",
          value: "x",
          negate: false,
        }),
      ),
    ).toEqual({ title: "x" });
    expect(
      createBasicFilterQuery(
        filter({
          key: "title",
          operation: "MATCHES",
          value: "x",
          negate: true,
        }),
      ),
    ).toEqual({ title: { $ne: "x" } });
  });

  it("converts _id values into ObjectIds", () => {
    const id = "646365496740ded7a396f5d0";
    const contains = createBasicFilterQuery(
      filter({ key: "_id", operation: "CONTAINS", value: id, negate: false }),
    );
    expect(contains._id).toBeInstanceOf(Types.ObjectId);
    expect(String(contains._id)).toBe(id);
    const negated = createBasicFilterQuery(
      filter({ key: "_id", operation: "MATCHES", value: id, negate: true }),
    );
    expect(String(negated._id.$ne)).toBe(id);
  });

  it("rejects invalid ObjectIds for _id filters with WrongObjectTypeError", () => {
    expect(() =>
      createBasicFilterQuery(
        filter({
          key: "_id",
          operation: "MATCHES",
          value: "nope",
          negate: false,
        }),
      ),
    ).toThrow(WrongObjectTypeError);
  });

  it("creates RADIUS queries in radians", () => {
    expect(
      createBasicFilterQuery(
        filter({
          key: "content.location",
          operation: "RADIUS",
          value: { center: [13.4, 52.5], radius: 6378.1 },
          negate: true,
        }),
      ),
    ).toEqual({
      "content.location": {
        $not: { $geoWithin: { $centerSphere: [[13.4, 52.5], 1] } },
      },
    });
  });

  it("creates AREA polygon queries", () => {
    const vertices = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ];
    expect(
      createBasicFilterQuery(
        filter({
          key: "content.location",
          operation: "AREA",
          value: { vertices },
          negate: false,
        }),
      ),
    ).toEqual({
      "content.location": {
        $geoWithin: { $geometry: { type: "Polygon", coordinates: [vertices] } },
      },
    });
  });

  it("throws OperationNotSupportedError for unknown operations", () => {
    expect(() =>
      createBasicFilterQuery(
        filter({ key: "x", operation: "FOO", value: 1, negate: false }),
      ),
    ).toThrow(OperationNotSupportedError);
  });
});

describe("filter.service createConcatenationFilterQuery", () => {
  const a = filter({ key: "a", operation: "EQ", value: 1, negate: false });
  const b = filter({ key: "b", operation: "IS", value: false, negate: false });

  it.each([
    [BooleanOperation.AND, "$and"],
    [BooleanOperation.OR, "$or"],
  ])("combines filters with %s", (booleanOperation, key) => {
    expect(
      createConcatenationFilterQuery({ booleanOperation, filters: [a, b] }),
    ).toEqual({ [key]: [{ a: { $eq: 1 } }, { b: { $eq: false } }] });
  });

  it("throws OperationNotSupportedError for unknown boolean operations", () => {
    expect(() =>
      createConcatenationFilterQuery({
        booleanOperation: "XOR",
        filters: [a],
      } as unknown as ConcatenationFilter),
    ).toThrow(OperationNotSupportedError);
  });
});
