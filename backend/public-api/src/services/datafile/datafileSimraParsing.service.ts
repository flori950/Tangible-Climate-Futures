import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { parse, Options as CsvParseOptions } from "csv-parse";
import { Model } from "mongoose";
import { FailedToParseError } from "../../errors";
import {
  Datafile,
  DataType,
  JsonObject,
  NotRefDataFile,
  SupportedDatasetFileTypes,
} from "../../../../../common/types";
import { toPointLocation } from "../../utils/utils";

/** Line separating the header section from the datapoint section of a SimRa file. */
const SIMRA_SEPARATOR = "=========================";

/**
 * Handle files from the SimRa dataset.
 *
 * A SimRa file consists of two CSV sections separated by a line of `=`:
 *   line 0: version info of the header section
 *   header section: CSV with column names (incidents)
 *   separator line
 *   next line: version info of the datapoint section
 *   datapoint section: CSV with column names (sensor datapoints)
 * Every CSV row becomes one NOTREFERENCED datafile. Datapoints reference
 * the IDs of the header documents in `content.data.headersRefs`.
 *
 * @param file - The SimRa file to create a datafile objects from.
 * @param model - The MongoDB Schema (model) for which to create the documents
 * @param tags - [Optional] The tags to be appended to all created documents, seperated by commas.
 * @param description - [Optional] The description to be added to all created documents.
 * @returns All created Datafile documents (headers first, then datapoints)
 * @throws FailedToParseError when the file is not a valid SimRa file
 */
export async function handleSimRaFile(
  file: Express.Multer.File,
  model: Readonly<Model<Datafile>>,
  tags?: string,
  description?: string,
): Promise<Datafile[]> {
  const lines = file.buffer.toString("utf8").split(/\r?\n/);
  // Get header line
  const headerLineIndex = lines.findIndex((line) =>
    line.includes(SIMRA_SEPARATOR),
  );
  if (headerLineIndex === -1) {
    throw new FailedToParseError("No header line inside the SimRa file.");
  }
  // Prepare tags
  const tagsArray = tags?.split(",").map((tag) => tag.trim());
  // Get header version and data version
  const headersVersion = lines[0];
  const dataVersion = lines[headerLineIndex + 1];
  if (dataVersion === undefined) {
    throw new FailedToParseError(
      `Line ${headerLineIndex + 1} not found inside the SimRa file.`,
    );
  }
  // Create uploadID
  const uploadID = randomUUID();
  const commonTags = (kind: string) => [
    "simra",
    kind,
    `${file.originalname}`,
    ...(tagsArray ?? []),
  ];

  // Create header documents (csv-parse lines are 1-based)
  const headerRows = await parseCSV(file.buffer, {
    from_line: 2,
    to_line: headerLineIndex - 1,
  });
  const headersObjects: NotRefDataFile[] = headerRows.map(
    (dataObject, dataID) => ({
      title: `${file.originalname}_header_${dataID}`,
      description:
        description ??
        `A header object no.${dataID} from SimRa dataset file: ${file.originalname}`,
      dataType: DataType.NOTREFERENCED,
      tags: commonTags("header"),
      uploadID: uploadID,
      dataSet: SupportedDatasetFileTypes.SIMRA,
      content: {
        data: { versionInfo: headersVersion, dataObject: dataObject },
        location: toPointLocation(dataObject.lon, dataObject.lat),
      },
    }),
  );
  const headerDocuments = (
    headersObjects.length ? await model.create(headersObjects) : []
  ) as Datafile[];
  const headerIDs = headerDocuments.map((document) => `${document._id}`);

  // Create datapoint documents
  const dataRows = await parseCSV(file.buffer, {
    from_line: headerLineIndex + 3,
  });
  const dataObjects: NotRefDataFile[] = dataRows.map((dataObject, dataID) => ({
    title: `${file.originalname}_${dataID}`,
    description:
      description ??
      `A datapoint no.${dataID} from SimRa dataset file: ${file.originalname}`,
    dataType: DataType.NOTREFERENCED,
    uploadID: uploadID,
    tags: commonTags("datapoint"),
    dataSet: SupportedDatasetFileTypes.SIMRA,
    content: {
      data: {
        versionInfo: dataVersion,
        dataObject: dataObject,
        headersRefs: headerIDs,
      },
      location: toPointLocation(dataObject.lon, dataObject.lat),
    },
  }));
  const dataDocuments = (
    dataObjects.length ? await model.create(dataObjects) : []
  ) as Datafile[];

  return [...headerDocuments, ...dataDocuments];
}

/**
 * Parses a part of a CSV buffer (with header line) into JSON objects.
 *
 * @param buffer the file content
 * @param options csv-parse options (e.g. `from_line`, `to_line`)
 * @returns array of row objects
 */
function parseCSV(
  buffer: Buffer,
  options: CsvParseOptions,
): Promise<JsonObject[]> {
  return new Promise<JsonObject[]>((resolve, reject) => {
    const rows: JsonObject[] = [];
    Readable.from([buffer])
      .pipe(parse({ ...options, columns: true }))
      .on("data", (row: JsonObject) => rows.push(row))
      .on("error", () =>
        reject(new FailedToParseError("Failed to parse SimRa file!")),
      )
      .on("end", () => resolve(rows));
  });
}
