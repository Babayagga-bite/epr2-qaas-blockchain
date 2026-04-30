// SPDX-License-Identifier: MIT
import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { helmetMiddleware, globalRateLimit } from "./middleware/security.js";
import { openapiSpec } from "./openapi.js";

const app: Express = express();

app.set("trust proxy", 1);

app.use(helmetMiddleware);
app.use(globalRateLimit);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Admin-Key"],
    exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/api/docs", (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Nexus-Forge QaaS — API Documentation</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
<style>
  body { margin: 0; background: #0a0a0f; }
  .swagger-ui .topbar { background: #0a0a0f !important; border-bottom: 1px solid #1a1a2e; padding: 8px 0; }
  .swagger-ui .topbar .download-url-wrapper { display: none !important; }
  .swagger-ui .topbar-wrapper img { display: none; }
  .swagger-ui .topbar-wrapper::before {
    content: "● NEXUS-FORGE QaaS — API Documentation";
    color: #fff;
    font-family: monospace;
    font-size: 12px;
    letter-spacing: 0.2em;
    padding-left: 16px;
  }
  .swagger-ui { background: #0a0a0f; }
  .swagger-ui .info .title { color: #fff !important; }
  .swagger-ui .info p, .swagger-ui .info li { color: #aaa !important; }
  .swagger-ui .scheme-container { background: #0d0d12 !important; box-shadow: none; border-bottom: 1px solid #1a1a2e; }
  .swagger-ui .opblock-tag { color: #fff !important; border-bottom: 1px solid #1a1a2e !important; }
  .swagger-ui section.models { border: 1px solid #1a1a2e !important; }
  .swagger-ui section.models h4 { color: #fff !important; }
  .swagger-ui .model-title { color: #fff !important; }
</style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  SwaggerUIBundle({
    url: "/api/openapi.json",
    dom_id: "#swagger-ui",
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: "BaseLayout",
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tagsSorter: "alpha",
  });
</script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.send(html);
});

app.get("/api/openapi.json", (_req: Request, res: Response) => {
  res.json(openapiSpec);
});

app.use("/api", router);

export default app;
