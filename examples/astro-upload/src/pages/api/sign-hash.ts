import { FirmaGobClient, FirmaGobClientError, Purpose } from "@ltorresu82/firmagob-client";
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({}));

  if (!body.hash || typeof body.hash !== "string") {
    return json({ error: "hash is required" }, 400);
  }

  try {
    const config = readConfig();
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
      { content: body.hash, contentType: "application/pdf" },
    ]);

    return json(result);
  } catch (error) {
    if (error instanceof FirmaGobClientError) {
      return json({ error: error.message, status: error.status }, 502);
    }

    return json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500
    );
  }
};

function readConfig() {
  const required = [
    "FIRMAGOB_ENTITY",
    "FIRMAGOB_API_TOKEN_KEY",
    "FIRMAGOB_RUN",
    "FIRMAGOB_PURPOSE",
    "FIRMAGOB_SECRET",
    "FIRMAGOB_ENDPOINT_API",
  ];
  const missing = required.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  const purpose = process.env.FIRMAGOB_PURPOSE!;

  if (purpose !== Purpose.Attended && purpose !== Purpose.Unattended) {
    throw new Error(`Unsupported FIRMAGOB_PURPOSE: ${purpose}`);
  }

  return {
    entity: process.env.FIRMAGOB_ENTITY!,
    apiTokenKey: process.env.FIRMAGOB_API_TOKEN_KEY!,
    run: process.env.FIRMAGOB_RUN!,
    purpose,
    secret: process.env.FIRMAGOB_SECRET!,
    endpointApi: process.env.FIRMAGOB_ENDPOINT_API!,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { "content-type": "application/json" },
  });
}
