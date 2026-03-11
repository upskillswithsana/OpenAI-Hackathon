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

function getApiBaseUrl() {
  const apiBaseUrl = process.env.API_BASE_URL?.trim().replace(/\/$/, "");

  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  return apiBaseUrl;
}

function buildTargetUrl(request: NextRequest, path: string[]) {
  const pathname = path.join("/");
  const url = new URL(`${getApiBaseUrl()}/${pathname}`);
  url.search = request.nextUrl.search;
  return url;
}

async function proxyRequest(request: NextRequest, path: string[]) {
  let target: URL;

  try {
    target = buildTargetUrl(request, path);
  } catch (error) {
    return Response.json(
      {
        detail:
          error instanceof Error ? error.message : "API proxy configuration is invalid.",
      },
      { status: 500 },
    );
  }

  const headers = new Headers(request.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => headers.delete(header));
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  HOP_BY_HOP_HEADERS.forEach((header) => responseHeaders.delete(header));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
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
