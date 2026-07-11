export type ApiEnv = {
  sessionSecret: string;
  pinSessionTtlSeconds: number;
  initialPin: string;
};

const DEFAULT_PIN_SESSION_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_INITIAL_PIN = "0000";

export function loadEnv(environment = process.env): ApiEnv {
  return {
    sessionSecret: readSessionSecret(environment),
    pinSessionTtlSeconds: readPinSessionTtlSeconds(environment),
    initialPin: readInitialPin(environment),
  };
}

function readPinSessionTtlSeconds(environment: NodeJS.ProcessEnv): number {
  const value = Number(
    environment.PIN_SESSION_TTL_SECONDS ?? DEFAULT_PIN_SESSION_TTL_SECONDS,
  );

  return Number.isInteger(value) && value > 0
    ? value
    : DEFAULT_PIN_SESSION_TTL_SECONDS;
}

function readSessionSecret(environment: NodeJS.ProcessEnv): string {
  const value = environment.SESSION_SECRET?.trim();

  if (!value) {
    if (environment.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required");
    }

    return "dev-session-secret";
  }

  return value;
}

function readInitialPin(environment: NodeJS.ProcessEnv): string {
  const value = environment.INITIAL_PIN?.trim();

  return value || DEFAULT_INITIAL_PIN;
}
