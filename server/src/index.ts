import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { initializeDatabase } from "./db.js";
import { api } from "./routes.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

app.use("/api", api);

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status = typeof err.status === "number" ? err.status : 500;
  const message = status === 500 ? "Internal server error" : err.message;
  console.error(err);
  res.status(status).json({ message });
};

app.use(errorHandler);

const databaseReady = process.env.DATABASE_URL ? initializeDatabase() : Promise.resolve();

databaseReady
  .then(() => {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL is not set. Database-backed CRUD routes require an external PostgreSQL connection.");
    }
    app.listen(port, () => {
      console.log(`CloudWear Distribution app running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
