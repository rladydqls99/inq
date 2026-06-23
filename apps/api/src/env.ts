export type ApiEnv = {
  sessionSecret: string;
  pinSessionTtlSeconds: number;
};

export function loadEnv(environment = process.env): ApiEnv {
  return {
    sessionSecret: readSessionSecret(environment),
    pinSessionTtlSeconds: Number(
      environment.PIN_SESSION_TTL_SECONDS ?? 60 * 60 * 24,
    ),
  };
}

function readSessionSecret(environment: NodeJS.ProcessEnv): string {
  const value = environment.SESSION_SECRET;

  if (!value) {
    if (environment.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET is required");
    }

    return "dev-session-secret";
  }

  return value;
}
