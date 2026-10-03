import os from "node:os";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer | undefined;

/**
 * Starts an in-memory MongoDB (mongodb-memory-server) and connects Mongoose to it.
 *
 * `runtimeAdapters.os` is passed explicitly because the MongoDB driver (>= 7) loads
 * `os` with a dynamic `import()`, which fails inside Jest's CommonJS VM. Without it
 * the handshake metadata is empty and the server rejects the connection with
 * "Missing required sub-document 'driver' in the client metadata document".
 */
export async function connectTestDatabase(): Promise<void> {
  // Generous start timeout: a cold start (fresh install, coverage run) can exceed the 10 s default
  mongoServer = await MongoMemoryServer.create({
    instance: { launchTimeout: 60_000 },
  });
  await mongoose.connect(mongoServer.getUri(), {
    runtimeAdapters: { os },
  });
}

/** Disconnects Mongoose and stops the in-memory MongoDB. */
export async function disconnectTestDatabase(): Promise<void> {
  await mongoose.disconnect();
  await mongoServer?.stop();
  mongoServer = undefined;
}
