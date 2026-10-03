/**
 * NetcdfApi is a utility class that provides methods for interacting with the
 * data-science (Python) service to process NetCDF files and retrieve metadata and data chunks.
 */
import axios from "axios";
import config from "../config/config";
import { FailedToParseError } from "../errors";

/** Separator the Python service puts between JSON objects in the CERv2 chunk stream. */
export const CHUNK_SEPARATOR = "||*split*||";

export default abstract class NetcdfApi {
  /**
   * The base URL for the NetCDF processing endpoint.
   */
  static readonly netCdf_endpoint =
    config.DATASCIENCE_BASE_URL + "/convert-netcdf-to-json";

  /**
   * Builds the multipart form data containing the uploaded file.
   */
  private static createFormData(file: Express.Multer.File): FormData {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype,
    });
    formData.append("file", blob, file.originalname);
    return formData;
  }

  /**
   * Posts the file to the given endpoint and parses the full (streamed) response as JSON.
   */
  private static async postAndParseJson(
    url: string,
    formData: FormData,
  ): Promise<unknown> {
    const response = await axios.post(url, formData, {
      responseType: "stream",
    });
    const chunks: Buffer[] = [];
    for await (const chunk of response.data) {
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  }

  /**
   * Retrieves metadata for a given NetCDF file.
   *
   * @param netCDFFile - The NetCDF file to extract metadata from.
   * @returns A Promise that resolves to the extracted metadata.
   * @throws FailedToParseError if there's an issue parsing the NetCDF file or processing the request.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getMetaData(netCDFFile: Express.Multer.File): Promise<any> {
    try {
      return await this.postAndParseJson(
        this.netCdf_endpoint + "/metadata",
        this.createFormData(netCDFFile),
      );
    } catch (error) {
      throw new FailedToParseError(
        `Failed to parse the provided NetCDF file. ${error}`,
      );
    }
  }

  /**
   * Retrieves data from a given NetCDF file.
   *
   * @param file - The NetCDF file to retrieve data from.
   * @returns A Promise that resolves to the retrieved data.
   * @throws FailedToParseError if there's an issue parsing the NetCDF file or processing the request.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async getFileData(file: Express.Multer.File): Promise<any> {
    try {
      return await this.postAndParseJson(
        this.netCdf_endpoint + "/data",
        this.createFormData(file),
      );
    } catch (error) {
      throw new FailedToParseError(
        `Failed to parse the provided NetCDF file. ${error}`,
      );
    }
  }

  /**
   * Retrieves data chunks from a NetCDF file using CERv2 format.
   *
   * @param file - The NetCDF file to retrieve data chunks from.
   * @param options - Additional options for filtering and chunk size.
   * @returns An AsyncGenerator that yields individual data chunks.
   * @throws FailedToParseError if there's an issue parsing the NetCDF file or processing the request.
   */
  static async *getCERv2DataChunks(
    file: Express.Multer.File,
    options?: { filter?: string[]; stepSize?: number },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): AsyncGenerator<any, void, undefined> {
    try {
      const url = this.netCdf_endpoint + "/cerv2-data-chunks";

      const formData = this.createFormData(file);
      if (options?.filter) {
        formData.append("filter_variables", options.filter.join(","));
      }
      if (options?.stepSize) {
        formData.append("step_size", JSON.stringify(options.stepSize));
      }

      const response = await axios.post(url, formData, {
        responseType: "stream",
      });

      // Decode incrementally so multi-byte characters split across chunks stay intact
      const decoder = new TextDecoder();
      let jsonData = "";
      for await (const chunk of response.data) {
        jsonData += decoder.decode(chunk, { stream: true });
        const lines = jsonData.split(CHUNK_SEPARATOR);
        // Process all complete objects; keep the last (possibly partial) one
        for (let i = 0; i < lines.length - 1; i++) {
          yield JSON.parse(lines[i]);
        }
        jsonData = lines[lines.length - 1];
      }
      jsonData += decoder.decode();

      // Process the remaining JSON object if it exists
      if (jsonData.trim() !== "") {
        yield JSON.parse(jsonData);
      }
    } catch (error) {
      console.error(error);
      throw new FailedToParseError("Failed to parse the provided NetCDF file.");
    }
  }
}
