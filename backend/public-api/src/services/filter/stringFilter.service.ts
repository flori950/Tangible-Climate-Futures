import { StringFilter, JsonObject } from "../../../../../common/types";
import { Types } from "mongoose";
import { WrongObjectTypeError } from "../../errors";

/**
 * Converts the filter value to an ObjectId (used when filtering by `_id`).
 * @throws WrongObjectTypeError if the value is not a valid 24-hex ObjectId.
 */
function toObjectId(value: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new WrongObjectTypeError(`"${value}" is not a valid ObjectId.`);
  }
  return new Types.ObjectId(value);
}

/**
 * Handles the CONTAINS filter operation
 * @param filter the provided filter
 * @returns mongoDB query
 */
export function createFilterQueryContains(filter: StringFilter): JsonObject {
  const keyString = filter.key;
  // Create the conditional
  let query: JsonObject = { $regex: filter.value, $options: "i" };
  // Check if ID is passed
  if (filter.key === "_id") {
    query = toObjectId(filter.value);
    // Append the NOT operation
    if (filter.negate) {
      query = { $ne: query };
    }
  } else {
    // Append the NOT operation
    if (filter.negate) {
      query = { $not: query };
    }
  }
  // Return the final json query
  return {
    [keyString]: query,
  };
}

/**
 * Handles the MATCHES filter operation
 * @param filter the provided filter
 * @returns mongoDB query
 */
export function createFilterQueryMatches(filter: StringFilter): JsonObject {
  const keyString = filter.key;
  // Create the conditional
  let query: JsonObject | string = filter.value;
  // Check if ID is passed
  if (filter.key === "_id") {
    query = toObjectId(filter.value);
  }
  // Append the NOT operation
  if (filter.negate) {
    query = { $ne: query };
  }
  // Return the final json query
  return {
    [keyString]: query,
  };
}
