import { StringFilter, JsonObject } from "../../../../../common/types";
import { Types } from "mongoose";
import { OperationNotSupportedError, WrongObjectTypeError } from "../../errors";

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

/** Maximum length of a CONTAINS search value. */
export const MAX_CONTAINS_LENGTH = 200;

/** Escapes all characters with a special meaning in regular expressions. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Handles the CONTAINS filter operation (case-insensitive substring search).
 * The value is matched literally, not as a regular expression.
 * @param filter the provided filter
 * @returns mongoDB query
 */
export function createFilterQueryContains(filter: StringFilter): JsonObject {
  const keyString = filter.key;
  // Create the conditional
  if (String(filter.value).length > MAX_CONTAINS_LENGTH) {
    throw new OperationNotSupportedError(
      `CONTAINS values are limited to ${MAX_CONTAINS_LENGTH} characters.`,
    );
  }
  let query: JsonObject = {
    $regex: escapeRegExp(String(filter.value)),
    $options: "i",
  };
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
