import { Purpose } from "@ltorresu82/firmagob-client";

export function readFirmaGobConfig() {
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
