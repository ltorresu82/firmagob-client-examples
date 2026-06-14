import { serve } from "@hono/node-server";
import {
  FirmaGobClient,
  FirmaGobClientError,
  Purpose,
} from "@ltorresu82/firmagob-client";
import { createHash } from "node:crypto";
import { Hono } from "hono";
import { readFirmaGobConfig } from "./config.js";

const app = new Hono();
const allowedOrigins = new Set(["http://127.0.0.1:4200", "http://localhost:4200"]);

app.use(
  "/sign/*",
  async (c, next) => {
    const origin = c.req.raw.headers.get("origin")?.trim();

    if (origin && allowedOrigins.has(origin)) {
      c.header("Access-Control-Allow-Origin", origin);
      c.header("Vary", "Origin", { append: true });
    }

    c.header("Access-Control-Allow-Headers", "content-type");
    c.header("Access-Control-Allow-Methods", "POST,OPTIONS");

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  }
);

app.get("/health", (c) => c.json({ ok: true }));

app.post("/sign/hash", async (c) => {
  const body = await c.req
    .json<{ hash?: string; otp?: string }>()
    .catch((): { hash?: string; otp?: string } => ({}));

  const hash = body.hash?.trim();
  const otp = body.otp?.trim();

  if (!hash) {
    return c.json({ error: "hash is required" }, 400);
  }

  try {
    const config = readFirmaGobConfig();

    if (config.purpose === Purpose.Attended && !otp) {
      return c.json(
        { error: "otp is required for attended signatures" },
        400
      );
    }

    const client = new FirmaGobClient({
      apiTokenKey: config.apiTokenKey,
      secret: config.secret,
      entity: config.entity,
      run: config.run,
      purpose: config.purpose,
      environment: "test",
      testUrl: config.endpointApi,
    });
    const result = await client.signHashes([
      { content: hash, contentType: "application/pdf" },
    ], otp ? { otp } : undefined);

    return c.json(result);
  } catch (error) {
    if (error instanceof FirmaGobClientError) {
      return c.json({ error: error.message, status: error.status }, 502);
    }

    return c.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500
    );
  }
});

app.post("/sign/pdf", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  const otpValue = body.otp;
  const otp = typeof otpValue === "string" ? otpValue.trim() : undefined;

  if (!(file instanceof File)) {
    return c.json({ error: "file is required" }, 400);
  }

  if (file.type && file.type !== "application/pdf") {
    return c.json({ error: "file must be a PDF" }, 400);
  }

  const fileBytes = Buffer.from(await file.arrayBuffer());
  const checksum = createHash("sha256").update(fileBytes).digest("hex");

  try {
    const config = readFirmaGobConfig();

    if (config.purpose === Purpose.Attended && !otp) {
      return c.json(
        { error: "otp is required for attended signatures" },
        400
      );
    }

    const client = new FirmaGobClient({
      apiTokenKey: config.apiTokenKey,
      secret: config.secret,
      entity: config.entity,
      run: config.run,
      purpose: config.purpose,
      environment: "test",
      testUrl: config.endpointApi,
    });
    const result = await client.signFiles([
      {
        content: fileBytes.toString("base64"),
        contentType: "application/pdf",
        checksum,
        description: file.name,
      },
    ], otp ? { otp } : undefined);

    return c.json({
      input: {
        fileName: file.name,
        fileSize: file.size,
        checksum,
      },
      result,
    });
  } catch (error) {
    if (error instanceof FirmaGobClientError) {
      return c.json({ error: error.message, status: error.status }, 502);
    }

    return c.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500
    );
  }
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port });
console.log(`Hono FirmaGob example listening on http://localhost:${port}`);
