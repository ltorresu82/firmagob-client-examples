import { Purpose } from "@ltorresu82/firmagob-client";

export type FirmaGobExampleConfig = {
  entity: string;
  apiTokenKey: string;
  run: string;
  purpose: Purpose;
  secret: string;
  endpointApi: string;
};

export function readFirmaGobConfig(): FirmaGobExampleConfig {
  const required = {
    entity: "FIRMAGOB_ENTITY",
    apiTokenKey: "FIRMAGOB_API_TOKEN_KEY",
    run: "FIRMAGOB_RUN",
    purpose: "FIRMAGOB_PURPOSE",
    secret: "FIRMAGOB_SECRET",
    endpointApi: "FIRMAGOB_ENDPOINT_API",
  };
  const missing = Object.values(required).filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    entity: process.env[required.entity]!,
    apiTokenKey: process.env[required.apiTokenKey]!,
    run: process.env[required.run]!,
    purpose: normalizePurpose(process.env[required.purpose]!),
    secret: process.env[required.secret]!,
    endpointApi: process.env[required.endpointApi]!,
  };
}

function normalizePurpose(value: string): Purpose {
  if (value === Purpose.Attended || value === Purpose.Unattended) {
    return value;
  }

  throw new Error(
    `Unsupported FIRMAGOB_PURPOSE. Expected "${Purpose.Unattended}" or "${Purpose.Attended}".`
  );
}
