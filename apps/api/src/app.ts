import { Hono } from "hono";

export const app = new Hono();

app.get("/api/health", (context) => {
  return context.json({ ok: true });
});
