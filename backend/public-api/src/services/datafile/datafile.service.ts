import {
  Datafile,
  DatafileCreateParams,
  FilterSetParams,
  DatafileUpdateParams,
  DeleteManyParam,
  SupportedRawFileTypes,
  MongooseObjectId,
  DataType,
  SupportedDatasetFileTypes,
  PaginationResult,
  NotRefDataFile,
} from "../../../../../common/types";
import DatafileModel from "../../models/datafile.model";
import { CrudService } from "../crud.service";
import {
  NotFoundError,
  OperationNotSupportedError,
  WrongObjectTypeError,
} from "../../errors";
import { Types } from "mongoose";
import {
  handleCSVFile,
  handleJSONFile,
  handleTXTFile,
} from "./datafileRawParsing.service";
import { handleSimRaFile } from "./datafileSimraParsing.service";
import NetcdfApi from "../netcdfApi.service";
import NetCDFJsonBucketService from "../bucket/netcdfBucket.service";
import { parsePath } from "../../utils/utils";
import { handleCERV2File } from "./datafileCERV2.service";
import { handleCSVDatasetFile } from "./datafileCSVParsing.service";

/**
 * DatafileService
 *
 * Service class for managing Datafile entities.
 * Extends the BaseService class with specific types for Datafile CRUD operations.
 */
export default class DatafileService extends CrudService<
  Datafile,
  DatafileCreateParams,
  DatafileUpdateParams
> {
  readonly netCDFbucketService: Readonly<NetCDFJsonBucketService> =
    new NetCDFJsonBucketService();

  /**
   * Constructs the DatafileService instance.
   * Initializes the BaseService with the Datafile model.
   */
  constructor() {
    super(DatafileModel);
  }

  /**
   * Replaces the GridFS reference (`content.data.dataObject.dataId`) of a NetCDF datafile
   * with the stored data. Errors are logged and the datafile is returned unchanged.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async resolveNetCdfData<D extends { _id?: any; content: any }>(
    datafile: D,
  ): Promise<D> {
    if (datafile.content?.data?.dataObject?.dataId) {
      try {
        const fileData = await this.netCDFbucketService.downloadFile(
          String(datafile._id),
        );
        datafile.content.data.dataObject.data = fileData;
        delete datafile.content.data.dataObject.dataId;
      } catch (error) {
        console.error("Error while reading file data:", error);
      }
    }
    return datafile;
  }

  override async get(id: string): Promise<Datafile> {
    return this.resolveNetCdfData(await super.get(id));
  }

  /**
   * Deletes a datafile and its NetCDF data stored in GridFS.
   */
  override async delete(id: string): Promise<Datafile> {
    const deleted = await super.delete(id);
    await this.netCDFbucketService.deleteFile(String(deleted._id));
    return deleted;
  }

  /**
   * Deletes datafiles and their NetCDF data stored in GridFS.
   */
  override async deleteMany(documentIDs: DeleteManyParam): Promise<Datafile[]> {
    const deleted = await super.deleteMany(documentIDs);
    for (const datafile of deleted) {
      await this.netCDFbucketService.deleteFile(String(datafile._id));
    }
    return deleted;
  }

  /**
   * Retrieves all entities.
   * @param onlyMetadata When returning objects, the data is skipped and only the metadata is returned.
   * @param skip Pagination, number of documents to skip (no. page)
   * @param limit Pagination, number of documents to return (page size)
   * @returns A PaginationResult object, containing results
   */
  async getAllExtended(
    onlyMetadata: boolean,
    skip: number,
    limit: number,
  ): Promise<PaginationResult<Datafile>> {
    const page = await this.getAll(skip, limit, {
      project: onlyMetadata ? [{ $unset: "content.data" }] : [],
    });
    page.results = await Promise.all(
      page.results.map((datafile) => this.resolveNetCdfData(datafile)),
    );
    return page;
  }

  /**
   * Appends the uploaded file to a document with given ID.
   * The content of the file replaces the `content` field inside the Datafile object.
   * No new datafiles are created.
   *
   * @param file - The file to append.
   * @param documentID - The ID of the document to which to append the file
   * @param fileType - Type of the uploaded file.
   * @returns A promise that resolves to the updated entity.
   * @throws OperationNotSupportedError if the file type is not supported.
   * @throws FailedToParseError if there was an error in parsing the file.
   * @throws WrongObjectTypeError selected document is not a NOTREFERENCED type.
   * @throws NotFoundError if the entity is not found.
   */
  async attachFile(
    file: Express.Multer.File,
    documentID: MongooseObjectId,
    fileType: SupportedRawFileTypes,
  ): Promise<Datafile> {
    // Create the Datafile JSON object based on file type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let dataObject: any;
    let updatedEntity: NotRefDataFile | null = null;
    let largeFileData: unknown;

    // Check if the document is a NOTREFERENCED type
    const entity: Datafile | null = await this.model.findById(documentID);
    if (!entity) {
      throw new NotFoundError();
    } else if (entity.dataType !== DataType.NOTREFERENCED) {
      throw new WrongObjectTypeError(
        "Selected file needs to be a NOTREFERENCED file type.",
      );
    }
    // Handle uploaded file based on its file type
    switch (fileType) {
      // Handles JSON files
      case SupportedRawFileTypes.JSON: {
        dataObject = handleJSONFile(file);
        break;
      }
      // Handles CSV files
      case SupportedRawFileTypes.CSV: {
        dataObject = await handleCSVFile(file);
        break;
      }
      case SupportedRawFileTypes.TXT: {
        dataObject = handleTXTFile(file);
        break;
      }
      case SupportedRawFileTypes.NETCDF: {
        // get netcdf metadata
        const metadata = await NetcdfApi.getMetaData(file);
        // get netcdf large data
        largeFileData = await NetcdfApi.getFileData(file);

        // upload raw data to bucket
        const dataId = await this.netCDFbucketService.uploadFile(
          documentID,
          largeFileData,
        );

        dataObject = { netCdfInfo: metadata, dataId };
        break;
      }
      // Unsupported file type
      default: {
        throw new OperationNotSupportedError("File type not supported!");
      }
    }
    // Replacing NetCDF data with another file type: remove the old GridFS file
    if (fileType !== SupportedRawFileTypes.NETCDF) {
      await this.netCDFbucketService.deleteFile(documentID);
    }
    // Attach the data
    if (dataObject) {
      updatedEntity = await this.attachDataToFile(documentID, dataObject);

      if (updatedEntity && largeFileData) {
        delete updatedEntity.content.data.dataObject.dataId;
        updatedEntity.content.data.dataObject.data = largeFileData;
      }
    }
    // Check if the attaching was successful
    if (!updatedEntity) {
      throw new NotFoundError();
    }
    return updatedEntity;
  }

  /**
   *  Attaches the data to the document.
   *
   * @param documentID The document ID to which to attach the data
   * @param dataObject The data to attach
   * @returns Promise of the updated Datafile.
   */
  async attachDataToFile(
    documentID: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataObject: any,
  ): Promise<NotRefDataFile | null> {
    // Update the data
    return (await this.model.findByIdAndUpdate(
      documentID,
      {
        "content.data": { dataObject },
      },
      { returnDocument: "after" },
    )) as NotRefDataFile | null;
  }

  /**
   * Creates all datafiles from the uploaded dataset file.
   * Each subfunction for handling specific datasets should create the documents themself.
   *
   * @param file - The file to append.
   * @param dataset - Type of the dataset provided.
   * @param tags - [Optional] The tags to be appended to all created documents, seperated by commas.
   * @param description - [Optional] The description to be added to all created documents.
   * @returns A promise that resolves to all created entities.
   * @throws OperationNotSupportedError if the dataset type is not supported.
   */
  async createFromFile(
    file: Express.Multer.File,
    dataset: SupportedDatasetFileTypes,
    tags?: string,
    description?: string,
    steps?: string,
  ): Promise<Datafile[]> {
    // Create the Datafile JSON object based on file type
    let createdDocuments: Datafile[];
    switch (dataset) {
      // Handles SimRa files
      case SupportedDatasetFileTypes.SIMRA: {
        createdDocuments = await handleSimRaFile(
          file,
          this.model,
          tags,
          description,
        );
        break;
      }
      // Handles CERv2 files
      case SupportedDatasetFileTypes.CERV2: {
        createdDocuments = await handleCERV2File(
          file,
          tags,
          steps ? +steps : undefined,
          description,
        );
        break;
      }
      // Handles CSV dataset files
      case SupportedDatasetFileTypes.CSV: {
        createdDocuments = await handleCSVDatasetFile(
          file,
          this.model,
          tags,
          description,
        );
        break;
      }
      // Unsupported dataset
      default: {
        throw new OperationNotSupportedError("Dataset not supported!");
      }
    }
    // Return created documents
    return createdDocuments;
  }

  /**
   * Retrieves the list of all matching files.
   *
   * @param filterSetParams - Object containing an array of filters to be executed.
   * @param skip Pagination, number of documents to skip (no. page)
   * @param limit Pagination, number of documents to return (page size)
   * @param onlyMetadata When returning objects, the data is skipped and only the metadata is returned.
   * @returns A PaginationResult object, containing results
   */
  async getFilteredExtended(
    filterSetParams: FilterSetParams,
    skip: number,
    limit: number,
    onlyMetadata: boolean,
  ): Promise<PaginationResult<Datafile>> {
    return this.getFiltered(filterSetParams, skip, limit, {
      project: onlyMetadata ? [{ $unset: "content.data" }] : [],
    });
  }

  /**
   * Returns a nested value based on a given key.
   *
   * @param documentID - The unique identifier of the document.
   * @param path - The path of the key you want to access.
   * @returns A promise that resolves to the nested value.
   * @throws NotFoundError if the document is not found or the path does not return a valid key.
   */
  async getNestedValue(
    documentId: MongooseObjectId,
    path: string,
  ): Promise<unknown> {
    const keyValue = parsePath(path)
      .split(".") // Splits path on "."
      .filter(Boolean) // removes empty strings
      .reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (obj: any, key: string) => {
          return obj && obj[key];
        },
        await this.get(documentId),
      );
    if (keyValue === undefined || keyValue === null) {
      throw new NotFoundError(`no key is found for the path ${path}`);
    }
    return keyValue;
  }

  /**
   * Parses the comma-separated IDs and makes sure that all documents exist.
   * @throws WrongObjectTypeError for malformed IDs, NotFoundError for unknown IDs.
   */
  private async resolveExistingIds(IDs: string): Promise<string[]> {
    const ids = [
      ...new Set(
        IDs.split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    ];
    const invalid = ids.filter((id) => !Types.ObjectId.isValid(id));
    if (ids.length === 0 || invalid.length > 0) {
      throw new WrongObjectTypeError(
        `Invalid document IDs: ${invalid.join(", ") || "(none given)"}`,
      );
    }
    const existing = await this.model
      .find({ _id: { $in: ids } }, { _id: 1 })
      .lean();
    const existingIds = new Set(existing.map((doc) => String(doc._id)));
    const missing = ids.filter((id) => !existingIds.has(id));
    if (missing.length > 0) {
      throw new NotFoundError(`Documents not found: ${missing.join(", ")}`);
    }
    return ids;
  }

  /** Loads the given documents in the given order. */
  private async findInOrder(ids: string[]): Promise<Datafile[]> {
    const documents = await this.model.find({ _id: { $in: ids } });
    const byId = new Map(documents.map((doc) => [String(doc._id), doc]));
    return ids.map((id) => byId.get(id)).filter(Boolean) as Datafile[];
  }

  /**
   * Deletes a value from all given documents under the given path.
   * All IDs are checked first, so either all documents are changed or none.
   *
   * @param IDs The IDs of all documents which will be changed, comma separated.
   * @param path Path of the variable to delete.
   * @returns A promise that resolves to the updated Datafiles.
   * @throws OperationNotSupportedError if the path is not writable.
   * @throws NotFoundError if one of the documents does not exist.
   */
  async deleteNestedValue(IDs: string, path: string): Promise<Datafile[]> {
    const mongoPath = toWritablePath(path);
    const ids = await this.resolveExistingIds(IDs);
    await this.model.updateMany(
      { _id: { $in: ids } },
      { $unset: { [mongoPath]: "" } },
    );
    return this.findInOrder(ids);
  }

  /**
   * Adds a value to all given documents under the given path.
   * All IDs are checked first, so either all documents are changed or none.
   *
   * @param IDs The IDs of all documents which will be changed, comma separated.
   * @param path Path of the variable to change.
   * @param value The new value.
   * @returns A promise that resolves to the updated Datafiles.
   * @throws OperationNotSupportedError if the path is not writable.
   * @throws NotFoundError if one of the documents does not exist.
   */
  async updateNestedValue(
    IDs: string,
    path: string,
    value: unknown,
  ): Promise<Datafile[]> {
    const mongoPath = toWritablePath(path);
    const ids = await this.resolveExistingIds(IDs);
    await this.model.updateMany(
      { _id: { $in: ids } },
      { $set: { [mongoPath]: value } },
    );
    return this.findInOrder(ids);
  }
}

/** Top-level fields that the nested-value endpoints may change. */
const WRITABLE_ROOT_FIELDS = ["content", "title", "description", "tags"];

/**
 * Converts a nested-value path (`a.b[0]`) into a MongoDB path and makes sure it is writable:
 * only below `content`, `title`, `description` or `tags`, no empty segments and no `$` operators.
 * @throws OperationNotSupportedError for any other path.
 */
export function toWritablePath(path: string): string {
  const mongoPath = parsePath(path);
  const segments = mongoPath.split(".");
  if (
    segments.some((segment) => segment === "" || segment.startsWith("$")) ||
    !WRITABLE_ROOT_FIELDS.includes(segments[0])
  ) {
    throw new OperationNotSupportedError(
      `The path "${path}" cannot be changed. Allowed are paths below: ${WRITABLE_ROOT_FIELDS.join(", ")}.`,
    );
  }
  return mongoPath;
}
