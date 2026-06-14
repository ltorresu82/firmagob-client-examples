import { Purpose } from "@ltorresu82/firmagob-client";

type ReadFirmaGobConfigOptions = {
  purpose?: Purpose;
};

const SANDBOX_RUN_BY_PURPOSE = {
  [Purpose.Attended]: "11111111",
  [Purpose.Unattended]: "22222222",
} as const;

export function readFirmaGobConfig(options: ReadFirmaGobConfigOptions = {}) {
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
  const selectedPurpose = options.purpose ?? purpose;

  if (purpose !== Purpose.Attended && purpose !== Purpose.Unattended) {
    throw new Error(`Unsupported FIRMAGOB_PURPOSE: ${purpose}`);
  }

  if (
    selectedPurpose !== Purpose.Attended &&
    selectedPurpose !== Purpose.Unattended
  ) {
    throw new Error(`Unsupported requested purpose: ${selectedPurpose}`);
  }

  return {
    entity: process.env.FIRMAGOB_ENTITY!,
    apiTokenKey: process.env.FIRMAGOB_API_TOKEN_KEY!,
    run: resolveRun(selectedPurpose, purpose),
    purpose: selectedPurpose,
    secret: process.env.FIRMAGOB_SECRET!,
    endpointApi: process.env.FIRMAGOB_ENDPOINT_API!,
  };
}

export function getFirmaGobModes() {
  return [
    {
      id: "unattended",
      label: "Desatendido",
      purpose: Purpose.Unattended,
      requiresOtp: false,
    },
    {
      id: "attended",
      label: "Proposito General",
      purpose: Purpose.Attended,
      requiresOtp: true,
    },
  ];
}

function resolveRun(selectedPurpose: Purpose, envPurpose: string): string {
  if (selectedPurpose === envPurpose) {
    return process.env.FIRMAGOB_RUN!;
  }

  const envName =
    selectedPurpose === Purpose.Attended
      ? "FIRMAGOB_ATTENDED_RUN"
      : "FIRMAGOB_UNATTENDED_RUN";

  return process.env[envName] ?? SANDBOX_RUN_BY_PURPOSE[selectedPurpose];
}
