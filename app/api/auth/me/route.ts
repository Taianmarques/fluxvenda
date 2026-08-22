import { NextResponse } from "next/server";
import { getOptionalSession } from "@/lib/auth/dal";

export async function GET() {
  const session = await getOptionalSession();
  return NextResponse.json({ signedIn: Boolean(session?.profileId) });
}
