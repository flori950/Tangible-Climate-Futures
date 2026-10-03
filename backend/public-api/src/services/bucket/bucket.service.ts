import mongoose, { mongo } from "mongoose";

/**
 * A service for managing file operations using GridFSBucket.
 * Files are stored as JSON strings inside the MongoDB database Mongoose is connected to.
 */
export abstract class BucketService {
  private gridFsBucket?: mongo.GridFSBucket;

  constructor(protected readonly bucketName = "default") {}

  /**
   * The GridFSBucket instance, created lazily so that the service can be
   * instantiated before the Mongoose connection is open.
   * @throws Error if Mongoose is not connected.
   */
  protected get bucket(): mongo.GridFSBucket {
    if (!this.gridFsBucket) {
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("GridFS bucket requires an open MongoDB connection.");
      }
      this.gridFsBucket = new mongo.GridFSBucket(db, {
        bucketName: this.bucketName,
      });
    }
    return this.gridFsBucket;
  }

  /**
   * Deletes files with a given name from the GridFSBucket.
   * @param name - The name of the files to delete.
   * @returns A Promise that resolves to true when all files are deleted successfully.
   */
  async deleteFilesByName(name: string): Promise<boolean> {
    const fileList = await this.bucket.find({ filename: name }).toArray();

    for (const file of fileList) {
      await this.bucket.delete(file._id);
    }

    return true;
  }

  /**
   * Uploads a file to the GridFSBucket (serialized with JSON.stringify).
   * If a file with the same name already exists, it is deleted before uploading the new file.
   * @param filename - The name of the file to upload.
   * @param file - The file content to upload.
   * @param contentType - The MIME type of the file (stored in the file's metadata).
   * @returns A Promise that resolves to the ObjectId (as string) of the uploaded file.
   */
  async uploadFile(
    filename: string,
    file: unknown,
    contentType?: string,
  ): Promise<string | undefined> {
    await this.deleteFilesByName(filename);

    return new Promise((resolve, reject) => {
      const uploadStream = this.bucket.openUploadStream(filename, {
        metadata: contentType ? { contentType } : undefined,
      });
      uploadStream.once("error", reject);
      uploadStream.once("finish", () => resolve(String(uploadStream.id)));
      uploadStream.end(JSON.stringify(file), "utf8");
    });
  }

  /**
   * Downloads a file from the GridFSBucket by its name.
   * @param filename - The name of the file to download.
   * @returns A Promise that resolves to the parsed (JSON) content of the downloaded file.
   */
  downloadFile(filename: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const downloadStream = this.bucket.openDownloadStreamByName(filename);
      const chunks: Buffer[] = [];
      downloadStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      downloadStream.on("error", reject);
      downloadStream.on("end", () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
