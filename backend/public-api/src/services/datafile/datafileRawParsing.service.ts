import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { JsonObject } from "../../../../../common/types";

import { FailedToParseError } from "../../errors";

/**
 * Handle JSON file for attaching its data to datafile
 *
 * @param file The JSON file with data to attach.
 * @returns Final Datafile object
 */
export function handleJSONFile(file: Express.Multer.File): JsonObject {
  try {
    const jsonObject = JSON.parse(file.buffer.toString());
    return jsonObject;
  } catch {
    throw new FailedToParseError("Failed to parse provided JSON file.");
  }
}

/**
 * Handle CSV file type for attaching its data to datafile
 * A header line is required for provided CSV files.
 *
 * @param file The CSV file with data to attach.
 * @returns Final Datafile object
 */
export async function handleCSVFile(
  file: Express.Multer.File,
): Promise<JsonObject> {
  // Return the array of parsed JSON objects
  const dataRows = await readCSV(file);
  return dataRows;
}

/**
 * Reads the CSV and creates a single JSON object from it.
 * @param file the file to read
 * @returns A promise with the JSON object
 */
async function readCSV(file: Express.Multer.File): Promise<JsonObject> {
  return new Promise<JsonObject>((resolve, reject) => {
    const dataRows: JsonObject[] = [];
    // Transform the multer file into a stream and parse each line into a JSON object,
    // using the first line as header
    Readable.from([file.buffer])
      .pipe(parse({ columns: true }))
      .on("data", (row: JsonObject) => {
        dataRows.push(row);
      })
      .on("error", () => {
        reject(new FailedToParseError("Failed to parse provided CSV file."));
      })
      .on("end", () => {
        resolve(dataRows);
      });
  });
}

/**
 * Handle TXT file type for attaching its data to datafile
 *
 * @param file The TXT file with data to attach.
 * @returns Final Datafile object.
 */
export function handleTXTFile(file: Express.Multer.File): JsonObject {
  try {
    const jsonObject = { text: file.buffer.toString() };
    return jsonObject;
  } catch {
    throw new FailedToParseError("Failed to parse provided TXT file.");
  }
}
