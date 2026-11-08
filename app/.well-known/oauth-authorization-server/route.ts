import { NextResponse } from "next/server";
import { ESCOPO_MCP, urlBase } from "@/lib/mcp/oauth";

// Descoberta do conector do Claude (RFC 8414)
export const dynamic = "force-dynamic";

export function GET() {
  const base = urlBase();
  return NextResponse.json({
    issuer: base,
    authorization_endpoint: `${base}/conectar-claude`,
    token_endpoint: `${base}/api/mcp/oauth/token`,
    registration_endpoint: `${base}/api/mcp/oauth/registrar`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [ESCOPO_MCP],
  });
}
