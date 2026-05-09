"""
WWEmbed FastAPI proxy.
Kubernetes ingress routes /api/* requests to port 8001 (this service).
We forward those requests transparently to the Next.js server running on
localhost:3000, which handles ALL the application logic + API routes.
"""
import os
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse, JSONResponse

NEXT_URL = os.environ.get("NEXT_INTERNAL_URL", "http://localhost:3000")

app = FastAPI(title="WWEmbed Proxy", openapi_url=None, docs_url=None, redoc_url=None)

EXCLUDED_RES_HEADERS = {
    "content-encoding",
    "transfer-encoding",
    "connection",
    "keep-alive",
}


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "wwembed-proxy"}


@app.api_route(
    "/api/{full_path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
)
async def proxy(full_path: str, request: Request):
    target_url = f"{NEXT_URL}/api/{full_path}"
    if request.url.query:
        target_url += f"?{request.url.query}"

    # Forward headers, but rewrite host
    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}

    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=120.0, follow_redirects=False) as client:
            upstream = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
            )
    except httpx.HTTPError as e:
        return JSONResponse(
            {"error": "upstream_unavailable", "detail": str(e)}, status_code=502
        )

    # Preserve duplicate headers (especially multiple Set-Cookie)
    # by using raw_headers list of tuples (bytes, bytes).
    raw_headers = []
    for k, v in upstream.headers.multi_items():
        if k.lower() in EXCLUDED_RES_HEADERS:
            continue
        raw_headers.append((k.encode("latin-1"), v.encode("latin-1")))

    response = Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )
    response.raw_headers = raw_headers
    return response
