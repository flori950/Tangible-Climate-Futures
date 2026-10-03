import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { Model } from "mongoose";
import { FailedToParseError } from "../../errors";
import { toPointLocation } from "../../utils/utils";
import {
  Datafile,
  DataType,
  JsonObject,
  SupportedDatasetFileTypes,
} from "../../../../../common/types";

/**
 * Handle files from the CSV dataset.
 * Every row of the CSV file becomes one NOTREFERENCED datafile. The CSV needs a header
 * line; the columns `lon` and `lat` are used as the location of the datapoint.
 *
 * @param file - The CSV file to create a datafile objects from.
 * @param model - The MongoDB Schema (model) for which to create the documents
 * @param tags - [Optional] The tags to be appended to all created documents, seperated by commas.
 * @param description - [Optional] The description to be added to all created documents.
 * @returns All created Datafile documents
 * @throws FailedToParseError when the CSV file cannot be parsed
 */
export async function handleCSVDatasetFile(
  file: Express.Multer.File,
  model: Readonly<Model<Datafile>>,
  tags?: string,
  description?: string,
): Promise<Datafile[]> {
  // Prepare tags
  const tagsArray = tags?.split(",").map((tag) => tag.trim());
  // Create uploadID
  const uploadID = randomUUID();
  // Create datapoint documents
  const dataObjects = await createCSVDatapointObjects(
    file,
    uploadID,
    tagsArray,
    description,
  );
  if (dataObjects.length === 0) {
    return [];
  }
  return (await model.create(dataObjects)) as unknown as Datafile[];
}

/**
 *  Returns an array of all datapoints documents.
 *
 * @param file the CSV file
 * @param uploadID the upload ID for this CSV file
 * @param tags - [Optional] The tags to be appended to all created documents.
 * @param description - [Optional] The description to be added to all created documents.
 * @returns array of MongoDB documents
 */
function createCSVDatapointObjects(
  file: Express.Multer.File,
  uploadID: string,
  tags?: string[],
  description?: string,
): Promise<JsonObject[]> {
  return new Promise<JsonObject[]>((resolve, reject) => {
    let dataID = 0;
    const documents: JsonObject[] = [];
    // Prepare all necessary data
    let finalTags = ["CSV", "datapoint", `${file.originalname}`];
    if (tags) {
      finalTags = finalTags.concat(tags);
    }
    Readable.from([file.buffer])
      .pipe(parse({ columns: true }))
      // Append the data to the array
      .on("data", (dataObject: JsonObject) => {
        documents.push({
          title: `${file.originalname}_${dataID}`,
          description:
            description ??
            `A datapoint no.${dataID} from CSV dataset file: ${file.originalname}`,
          dataType: DataType.NOTREFERENCED,
          uploadID: uploadID,
          tags: finalTags,
          dataSet: SupportedDatasetFileTypes.CSV,
          content: {
            data: dataObject,
            location: toPointLocation(dataObject.lon, dataObject.lat),
          },
        });
        dataID++;
      })
      .on("error", () => {
        reject(new FailedToParseError("Failed to parse the CSV dataset file!"));
      })
      .on("end", () => {
        resolve(documents);
      });
  });
}
