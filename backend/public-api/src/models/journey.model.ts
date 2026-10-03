import mongoose, { Schema, model } from "mongoose";
import { Visibility } from "../../../../common/types";
import { Journey } from "../../../../common/types";

/**
 * The MongoDB Schema for the Journey document.
 * For more info look inside Repo's Wiki.
 */
const JourneySchema = new Schema<Journey & { ownerUID?: string }>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    tags: {
      type: [String],
      required: true,
    },
    author: {
      type: String,
      required: true,
    },
    parentID: mongoose.Schema.Types.ObjectId,
    visibility: {
      type: String,
      enum: Object.values(Visibility),
      required: true,
    },
    collections: {
      type: [Object],
      required: true,
    },
    excludedIDs: {
      type: [String],
      required: false,
    },
    // Firebase UID of the creator. Internal: never returned by the API (select: false),
    // see services/journey/journey.service.ts for the ownership rules.
    ownerUID: {
      type: String,
      select: false,
      index: true,
    },
  },
  { timestamps: true },
);

export default model<Journey>("Journey", JourneySchema, "journeys");
