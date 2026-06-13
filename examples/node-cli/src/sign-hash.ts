import { FirmaGobClient, FirmaGobClientError } from "@ltorresu82/firmagob-client";
import { readFirmaGobConfig } from "./config.js";

const hash = process.argv[2];
const otp = process.argv[3]?.trim();

if (!hash) {
  console.error("Usage: pnpm dev:node HASH_SHA256_BASE64");
  process.exit(1);
}

const config = readFirmaGobConfig();
const client = new FirmaGobClient({
  apiTokenKey: config.apiTokenKey,
  secret: config.secret,
  entity: config.entity,
  run: config.run,
  purpose: config.purpose,
  environment: "test",
  testUrl: config.endpointApi,
});

try {
  const result = await client.signHashes([
    { content: hash, contentType: "application/pdf" },
  ], otp ? { otp } : undefined);

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  if (error instanceof FirmaGobClientError) {
    console.error(
      JSON.stringify(
        {
          error: error.message,
          status: error.status,
          responseBody: redactSecrets(error.responseBody),
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  throw error;
}

function redactSecrets(value: string | undefined): string | undefined {
  return value
    ?.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "[redacted-token-key]"
    )
    .replace(/[0-9a-f]{32}/gi, "[redacted-secret]");
}
