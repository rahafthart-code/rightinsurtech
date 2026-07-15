import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error("[server.error]", error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Inject security headers + sensible cache hints on every response.
const securityHeadersMiddleware = createMiddleware().server(async ({ next, request }) => {
  const response = await next();
  const res = response instanceof Response ? response : new Response(String(response));
  const headers = new Headers(res.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Cache hint for static-ish HTML pages; APIs override with no-store.
  const url = new URL(request.url);
  if (!headers.has("cache-control") && !url.pathname.startsWith("/api/")) {
    headers.set("cache-control", "public, max-age=0, must-revalidate");
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, securityHeadersMiddleware],
}));
