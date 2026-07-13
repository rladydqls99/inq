type AttemptState = {
  failures: number;
  blockedUntil: number | null;
  expiresAt: number;
};

const MAX_TRACKED_CLIENTS = 10_000;

export class PinAttemptLimiter {
  private readonly attempts = new Map<string, AttemptState>();

  constructor(
    private readonly maxAttempts: number,
    private readonly lockoutMilliseconds: number,
  ) {}

  retryAfterSeconds(clientKey: string, now = Date.now()): number {
    const state = this.attempts.get(clientKey);

    if (!state) {
      return 0;
    }

    if (state.expiresAt <= now) {
      this.attempts.delete(clientKey);
      return 0;
    }

    if (!state.blockedUntil) {
      return 0;
    }

    return Math.max(1, Math.ceil((state.blockedUntil - now) / 1000));
  }

  recordFailure(clientKey: string, now = Date.now()): number {
    const activeBlock = this.retryAfterSeconds(clientKey, now);

    if (activeBlock > 0) {
      return activeBlock;
    }

    const failures = (this.attempts.get(clientKey)?.failures ?? 0) + 1;

    if (failures >= this.maxAttempts) {
      const blockedUntil = now + this.lockoutMilliseconds;
      this.set(
        clientKey,
        { failures: 0, blockedUntil, expiresAt: blockedUntil },
        now,
      );
      return Math.max(1, Math.ceil(this.lockoutMilliseconds / 1000));
    }

    this.set(
      clientKey,
      {
        failures,
        blockedUntil: null,
        expiresAt: now + this.lockoutMilliseconds,
      },
      now,
    );
    return 0;
  }

  reset(clientKey: string) {
    this.attempts.delete(clientKey);
  }

  private set(clientKey: string, state: AttemptState, now: number) {
    if (
      !this.attempts.has(clientKey) &&
      this.attempts.size >= MAX_TRACKED_CLIENTS
    ) {
      this.removeExpiredAttempts(now);

      if (this.attempts.size >= MAX_TRACKED_CLIENTS) {
        const oldestKey = this.attempts.keys().next().value;

        if (oldestKey) {
          this.attempts.delete(oldestKey);
        }
      }
    }

    this.attempts.set(clientKey, state);
  }

  private removeExpiredAttempts(now: number) {
    for (const [clientKey, state] of this.attempts) {
      if (state.expiresAt <= now) {
        this.attempts.delete(clientKey);
      }
    }
  }
}
