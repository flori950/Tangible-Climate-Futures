import { Request, Response, NextFunction } from "express";
import { ValidateError } from "tsoa";
import mongoose from "mongoose";
import multer from "multer";
import {
  ForbiddenError,
  PayloadTooLargeError,
  FailedToParseError,
  NotFoundError,
  OperationNotSupportedError,
  WrongObjectTypeError,
  UnauthorizedError,
} from "../errors";

/** MongoDB error code "Can't extract geo keys" (invalid GeoJSON for a 2dsphere index). */
const GEO_KEY_ERROR = 16755;

/**
 * Whether the error is a client error created with `http-errors`
 * (used by Express' body parsers), e.g. `413 request entity too large`.
 */
function isClientHttpError(
  err: unknown,
): err is Error & { status: number; expose: true } {
  if (!(err instanceof Error) || err instanceof SyntaxError) return false;
  const { status, expose } = err as Error & {
    status?: unknown;
    expose?: unknown;
  };
  return (
    expose === true &&
    typeof status === "number" &&
    status >= 400 &&
    status < 500
  );
}

/**
 * Handles thrown errors in the BE and maps them to HTTP responses.
 * @param err the thrown error
 * @param req the HTTP Request
 * @param res the HTTP Response
 * @param next Next express middleware
 * @returns Response with error
 */
function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  // If the response is already being sent, let Express close the connection.
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof ValidateError) {
    // Instance of a tsoa (TypeScript) validation error
    console.warn(`Caught Validation Error for ${req.path}:`, err.fields);
    return res.status(422).json({
      message: err.message ? err.message : "TypeScript Validation Failed",
      details: err?.fields,
    });
  } else if (err instanceof NotFoundError) {
    // Some file/data was not found.
    return res.status(404).json({
      message: err.message ? err.message : "Not Found",
    });
  } else if (err instanceof OperationNotSupportedError) {
    // Signalize that operation is not supported.
    return res.status(400).json({
      message: err.message ? err.message : "Operation not supported.",
    });
  } else if (err instanceof UnauthorizedError) {
    // Thrown when the user is not authorized to access an endpoint
    return res.status(401).json({
      message: "Access denied. Please provide valid credentials.",
    });
  } else if (err instanceof ForbiddenError) {
    // Authenticated, but not allowed to change this resource
    return res.status(403).json({
      message: err.message ? err.message : "Forbidden.",
    });
  } else if (
    err instanceof PayloadTooLargeError ||
    (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE")
  ) {
    // Uploaded file larger than MAX_UPLOAD_SIZE_MB
    return res.status(413).json({
      message: err.message ? err.message : "Payload too large.",
    });
  } else if (err instanceof multer.MulterError) {
    // Other upload problems (unexpected field, too many files, ...)
    return res.status(400).json({
      message: err.message,
    });
  } else if (isClientHttpError(err)) {
    // Errors of Express' body parsers (e.g. body too large: 413, wrong charset: 415)
    return res.status(err.status).json({
      message: err.message,
    });
  } else if (err instanceof WrongObjectTypeError) {
    // Signalize that wrong type of object was selected
    return res.status(400).json({
      message: err.message ? err.message : "Wrong type of object selected.",
    });
  } else if (err instanceof FailedToParseError) {
    // Failed to parse provided file
    return res.status(400).json({
      message: err.message ? err.message : "Failed to parse provided file.",
    });
  } else if (
    err instanceof mongoose.mongo.MongoServerError &&
    err.code === GEO_KEY_ERROR
  ) {
    // Location is not valid GeoJSON (2dsphere index)
    return res.status(400).json({
      message:
        "Invalid location: expected GeoJSON Point with [longitude, latitude].",
    });
  } else if (err instanceof mongoose.Error) {
    // Error of MongoDB if the document does not follow a schema
    console.warn(`Caught ${err.name} Error for ${req.path}:`, err);
    return res.status(500).json({
      message: err.message
        ? err.message
        : "Database's Schema Validation Failed",
      details: err.message,
    });
  } else if (err instanceof SyntaxError) {
    // Most often is thrown when provided JSON has a syntax mistake
    return res.status(400).json({
      message: err.message ? err.message : "Syntax Error",
      details: err.message,
    });
  } else if (err instanceof Error) {
    // General error
    console.warn(`Caught ${err.name} Error for ${req.path}:`, err);
    return res.status(500).json({
      message: err.message ? err.message : "Internal Server Error",
      details: "Look at the console for more details.",
    });
  }
  // Anything else that was thrown (e.g. a plain object or string)
  console.warn(`Caught unknown error for ${req.path}:`, err);
  return res.status(500).json({
    message: "Internal Server Error",
  });
}

export default errorMiddleware;
