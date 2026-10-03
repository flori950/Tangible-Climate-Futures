import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import compression from "compression";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { RegisterRoutes } from "../build/routes";
import swaggerDocument from "../build/swagger.json";

import config from "./config/config";
import errorMiddleware from "./middlewares/error.middleware";

/**
 * Tangible Climate Futures Server App
 */
class App {
  public readonly express: Application;

  constructor() {
    this.express = express();

    this.initializeMiddleware();
    this.generateRoutesAndInitializeSwagger();
    this.initializeErrorHandling();
  }

  /**
   * Initializes the middleware for the Express app.
   */
  private initializeMiddleware(): void {
    // Cors (Cross-Origin Resource Sharing)
    this.express.use(cors({ origin: "*" }));
    // Request logging (silenced in tests)
    if (process.env.NODE_ENV !== "test") {
      this.express.use(morgan("dev"));
    }
    this.express.use(compression());
    this.express.use(helmet());
    // Body parsing (built into Express since 4.16, body-parser is not needed)
    this.express.use(express.urlencoded({ extended: true }));
    this.express.use(express.json());
  }

  // initialize Database Connection
  private async initializeDatabaseConnection(): Promise<void> {
    const { MONGODB_URL } = config;

    // register disconnect when exiting the app
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("Disconnected from the database");
      process.exit(0);
    });

    try {
      await mongoose.connect(MONGODB_URL);
      console.log("Connected to the database.");
    } catch (error) {
      console.error("Cannot connect to the database!", error);
      // Terminate the process/container
      process.exit(1);
    }
  }

  // Generates routes and initializes Swagger documentation.
  private generateRoutesAndInitializeSwagger(): void {
    // register swagger route
    this.express.use(
      "/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument),
    );

    // register route for health check
    this.express.get("/health", (_req: Request, res: Response) => {
      res.status(200).json({
        status: "healthy",
      });
    });

    // register generated routes
    RegisterRoutes(this.express);
  }

  /**
   * Initializes error handling middleware.
   * Must be called after registering routes.
   */
  private initializeErrorHandling() {
    this.express.use(errorMiddleware);
  }

  // start express server
  private async listen(): Promise<void> {
    const { HOST, PORT, DISABLE_SWAGGER_AUTH } = config;

    return new Promise((resolve) =>
      this.express.listen(PORT, () => {
        console.log(`Api is running on http://${HOST}:${PORT}/api`);
        console.log(`Documentation is running on http://${HOST}:${PORT}/docs`);
        console.log(`Health check is running on http://${HOST}:${PORT}/health`);
        if (DISABLE_SWAGGER_AUTH) {
          console.warn(
            "Authentication is disabled for ALL endpoints (DISABLE_SWAGGER_AUTH=true)!",
          );
        }

        resolve();
      }),
    );
  }

  // start the application
  public async start(): Promise<void> {
    await this.initializeDatabaseConnection();
    await this.listen();
  }
}

export default App;
