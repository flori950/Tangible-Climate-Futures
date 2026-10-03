/**
 * NetCDFJsonBucketService extends the functionality of the BucketService class
 * specifically for handling NetCDF JSON files within a storage bucket.
 */
import { BucketService } from "./bucket.service";

export default class NetCDFJsonBucketService extends BucketService {
  /**
   * The file extension for NetCDF JSON files.
   */
  protected readonly fileExtension = ".netcdf.json";

  /**
   * Constructs a new NetCDFJsonBucketService instance.
   * Initializes the service with the "netcdf" bucket name.
   */
  constructor() {
    super("netcdf");
  }

  /**
   * Uploads a NetCDF JSON file to the storage bucket.
   *
   * @param documentId - The unique identifier for the document.
   * @param file - The NetCDF JSON file content to be uploaded.
   * @returns A Promise that resolves to the URL of the uploaded file in the storage bucket.
   */
  override async uploadFile(
    documentId: string,
    file: unknown,
  ): Promise<string | undefined> {
    return await super.uploadFile(
      documentId + this.fileExtension,
      file,
      "application/json",
    );
  }

  /**
   * Downloads a NetCDF JSON file from the storage bucket.
   *
   * @param documentId - The unique identifier for the document.
   * @returns A Promise that resolves to the downloaded NetCDF JSON file content.
   */
  override async downloadFile(documentId: string): Promise<unknown> {
    return await super.downloadFile(documentId + this.fileExtension);
  }

  /**
   * Deletes the NetCDF JSON file of a datafile (no-op if there is none).
   *
   * @param documentId - The unique identifier for the document.
   */
  async deleteFile(documentId: string): Promise<boolean> {
    return await this.deleteFilesByName(documentId + this.fileExtension);
  }
}
