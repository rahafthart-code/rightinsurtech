import { createFileRoute } from "@tanstack/react-router";

// Liveness probe — must be cheap and never depend on external services.
export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(
          JSON.stringify({
            status: "ok",
            service: "right-api",
            uptime: typeof process !== "undefined" ? (process.uptime?.() ?? null) : null,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store, no-cache, must-revalidate",
            },
          },
        );
      },
    },
  },
});
