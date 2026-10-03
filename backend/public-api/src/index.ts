import App from "./app";

// Create server app
const app = new App();

// Start the server
app.start().catch((error: unknown) => {
  console.error("Failed to start the server", error);
  process.exit(1);
});
