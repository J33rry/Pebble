import express from "express";
import cors from "cors";

import { env } from "./config/env.js";
import { sessionMiddleware } from "./lib/session.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireTrustedOrigin } from "./middleware/originCheck.js";
import apiRoutes from "./routes.js";

export const app = express();

// One proxy in front in production; needed for secure cookies and client IPs.
app.set("trust proxy", 1);

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(requireTrustedOrigin);
app.use(express.json());
app.use(sessionMiddleware);

app.use("/api/v1", apiRoutes);

// Must stay last.
app.use(errorHandler);
