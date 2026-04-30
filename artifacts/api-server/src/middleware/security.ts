// SPDX-License-Identifier: MIT
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

export const helmetMiddleware: RequestHandler = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "cdn.jsdelivr.net"],
      connectSrc: ["'self'", "cdn.jsdelivr.net"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: "deny" },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
  xssFilter: true,
}) as RequestHandler;

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many requests. Retry after 15 minutes.", code: "RATE_LIMITED" },
  skip: (req) => req.path === "/api/healthz",
});

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Retry after 1 minute.", code: "AUTH_RATE_LIMITED" },
});

export const simulationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Simulation rate limit exceeded.", code: "SIM_RATE_LIMITED" },
});
