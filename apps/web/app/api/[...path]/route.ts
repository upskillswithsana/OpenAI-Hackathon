import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
];

function getApiBaseUrls() {
  const configured = process.env.API_BASE_URL?.trim().replace(/\/$/, "");
  const candidates = [configured, "http://api:8000", "http://host.docker.internal:8000"];
  const urls = candidates.filter((value): value is string => Boolean(value));
  return [...new Set(urls)];
}

function buildTargetUrl(request: NextRequest, path: string[], apiBaseUrl: string) {
  const pathname = path.join("/");
  const url = new URL(`${apiBaseUrl}/${pathname}`);
  url.search = request.nextUrl.search;
  return url;
}

async function proxyRequest(request: NextRequest, path: string[]) {
  const apiBaseUrls = getApiBaseUrls();
  if (apiBaseUrls.length === 0) {
    return Response.json({ detail: "API proxy configuration is invalid." }, { status: 500 });
  }

  const headers = new Headers(request.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");

  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  let lastError: unknown = null;

  for (const apiBaseUrl of apiBaseUrls) {
    let target: URL;

    try {
      target = buildTargetUrl(request, path, apiBaseUrl);
    } catch (error) {
      lastError = error;
      continue;
    }

    try {
      const response = await fetch(target, {
        method: request.method,
        headers,
        body,
        redirect: "manual",
      });

      const responseHeaders = new Headers(response.headers);
      HOP_BY_HOP_HEADERS.forEach((header) => responseHeaders.delete(header));

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      lastError = error;
    }
  }

  return Response.json(
    {
      detail:
        lastError instanceof Error
          ? `API proxy request failed: ${lastError.message}`
          : "API proxy request failed.",
    },
    { status: 500 },
  );
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function handleRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxyRequest(request, path);
}

export function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function PUT(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function DELETE(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}

export function OPTIONS(request: NextRequest, context: RouteContext) {
  return handleRequest(request, context);
}
