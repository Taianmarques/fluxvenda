import { NextResponse } from "next/server";
import { ESCOPO_MCP, urlBase, urlMcp } from "@/lib/mcp/oauth";

// Descoberta do conector do Claude (RFC 9728)
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    resource: urlMcp(), resource_name: "FluxVenda", authorization_servers: [urlBase()],
    scopes_supported: [ESCOPO_MCP], bearer_methods_supported: ["header"],
  });
}
