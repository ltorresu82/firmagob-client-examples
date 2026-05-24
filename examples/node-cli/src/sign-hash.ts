import { FirmaGobClient } from "@ltorresu82/firmagob-client";
import { readFirmaGobConfig } from "./config.js";

const hash = process.argv[2];

if (!hash) {
  console.error("Usage: npm run node-cli -- HASH_SHA256_BASE64");
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

const result = await client.signHashes([
  { content: hash, contentType: "application/pdf" },
]);

console.log(JSON.stringify(result, null, 2));
