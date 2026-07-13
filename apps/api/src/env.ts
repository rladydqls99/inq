export type ApiEnv = {
  sessionSecret: string;
  pinSessionTtlSeconds: number;
  initialPin: string;
  secureCookies: boolean;
  pinMaxAttempts: number;
  pinLockoutSeconds: number;
};

const DEFAULT_PIN_SESSION_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_INITIAL_PIN = "0000";
const DEFAULT_PIN_MAX_ATTEMPTS = 10;
const DEFAULT_PIN_LOCKOUT_SECONDS = 5 * 60;

export function loadEnv(environment = process.env): ApiEnv {
  return {
    sessionSecret: readSessionSecret(environment),
    pinSessionTtlSeconds: readPinSessionTtlSeconds(environment),
    initialPin: readInitialPin(environment),
    secureCookies: environment.NODE_ENV === "production",
    pinMaxAttempts: readPositiveInteger(
      environment.PIN_MAX_ATTEMPTS,
      DEFAULT_PIN_MAX_ATTEMPTS,
    ),
    pinLockoutSeconds: readPositiveInteger(
      environment.PIN_LOCKOUT_SECONDS,
      DEFAULT_PIN_LOCKOUT_SECONDS,
    ),
  };
}

function readPinSessionTtlSeconds(environment: NodeJS.ProcessEnv): number {
  return readPositiveInteger(
    environment.PIN_SESSION_TTL_SECONDS,
    DEFAULT_PIN_SESSION_TTL_SECONDS,
  );
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

  if (!value && environment.NODE_ENV === "production") {
    throw new Error("INITIAL_PIN is required");
  }

  return value || DEFAULT_INITIAL_PIN;
}

function readPositiveInteger(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value ?? fallback);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
