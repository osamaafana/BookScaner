import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fileType from "file-type";
import { createProxyMiddleware } from "http-proxy-middleware";

import { deviceMiddleware } from "./middleware/device";
import { burstLimiter } from "./middleware/burst";

const PORT = Number(process.env.PORT || 3001);
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 10);
const RL_WINDOW_MS = Number(process.env.RL_WINDOW_MS || 5 * 60 * 1000);
const RL_MAX = Number(process.env.RL_MAX || 60);
const BURST_PER_SEC = Number(process.env.BURST_PER_SEC || 20);
const SECURE_COOKIES = (process.env.SECURE_COOKIES || "false") === "true";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

const app = express();
app.set("trust proxy", 1); // behind Vercel/NGINX/CDN
app.use(helmet());
app.use(cookieParser());

// Basic per-IP windowed limits
app.use(
  rateLimit({
    windowMs: RL_WINDOW_MS,
    max: RL_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Small in-memory burst limiter (DoS smoothing)
app.use(burstLimiter(BURST_PER_SEC));

// Attach/issue device cookie
app.use(deviceMiddleware({ secure: SECURE_COOKIES }));

// JSON body for proxied non-upload routes
app.use(express.json({ limit: "1mb" }));

// Multer (memory) with size cap + MIME pre-check
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      const err: any = new Error("Unsupported media type");
      err.status = 415;
      return cb(err);
    }
    cb(null, true);
  },
});

// Health (gateway)
app.get("/health", (_req, res) => res.json({ status: "ok", where: "web-gateway" }));

/**
 * /api/scan:
 *  - accepts image via multipart
 *  - validates type/size (+ magic bytes)
 *  - forwards to FastAPI /v1/scan with X-Device-Id
 */
app.post("/api/scan", upload.single("image"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "image file required (field 'image')" });

    // Magic-byte sniffing (defense-in-depth)
    const ft = await fileType.fromBuffer(file.buffer);
    const magicOk = ft && ALLOWED.has(ft.mime);
    if (!magicOk) return res.status(415).json({ error: "invalid file signature" });

    // Forward to backend
    const form = new FormData();
    form.append("image", file.buffer, {
      filename: file.originalname || "upload.jpg",
      contentType: file.mimetype,
      knownLength: file.size,
    });

    const r = await axios.post(`${BACKEND_URL}/v1/scan`, form, {
      headers: {
        ...form.getHeaders(),
        "X-Device-Id": req.deviceId || "",
      },
      // Forward gateway IP as X-Forwarded-For chain if desired
      validateStatus: () => true,
      maxBodyLength: Infinity,
    });

    res.status(r.status).set(r.headers["content-type"] ? { "content-type": r.headers["content-type"] } : {}).send(r.data);
  } catch (err: any) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `Max upload ${MAX_UPLOAD_MB} MB` });
    }
    const status = err?.status || err?.response?.status || 502;
    res.status(status).json({ error: "scan_proxy_error", detail: String(err?.message || err) });
  }
});

// Proxy admin endpoints with special handling for admin token
app.use("/api/admin", createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  selfHandleResponse: false,
  on: {
    proxyReq: (proxyReq: any, req: any) => {
      // pass through device id
      const id = req.deviceId || "";
      proxyReq.setHeader("X-Device-Id", id);
      // ensure JSON bodies are forwarded if present
      if (req.body && typeof req.body === "object") {
        const body = JSON.stringify(req.body);
        proxyReq.setHeader("content-type", "application/json");
        proxyReq.setHeader("content-length", Buffer.byteLength(body));
        proxyReq.write(body);
        proxyReq.end();
      }
    }
  }
}));

// Proxy all other /api/* to FastAPI /v1/*
app.use(
  "/api",
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    selfHandleResponse: false,
    pathRewrite: (_path, req) => {
      // /api/foo -> /v1/foo
      const rest = (req.url || "").replace(/^\/api\/?/, "");
      return `/v1/${rest}`;
    },
    on: {
      proxyReq: (proxyReq: any, req: any) => {
        // pass through device id
        const id = req.deviceId || "";
        proxyReq.setHeader("X-Device-Id", id);
        // ensure JSON bodies are forwarded if present
        if (req.body && typeof req.body === "object") {
          const body = JSON.stringify(req.body);
          proxyReq.setHeader("content-type", "application/json");
          proxyReq.setHeader("content-length", Buffer.byteLength(body));
          proxyReq.write(body);
          proxyReq.end();
        }
      }
    },
  })
);

// Multer/global error handler (size/type)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: `Max upload ${MAX_UPLOAD_MB} MB` });
  if (err?.status === 415) return res.status(415).json({ error: "Only JPEG/PNG/WebP are allowed" });
  res.status(500).json({ error: "gateway_error", detail: String(err?.message || err) });
});

app.listen(PORT, () => console.log(`web-gateway listening on ${PORT}, proxy -> ${BACKEND_URL}`));
