import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/sign-in?verified=0", req.url));

  const profile = await prisma.profile.findUnique({ where: { emailVerifyToken: token } });
  if (!profile || !profile.emailVerifyExpiresAt || profile.emailVerifyExpiresAt < new Date()) {
    return NextResponse.redirect(new URL("/sign-in?verified=0", req.url));
  }

  await prisma.profile.update({
    where: { id: profile.id },
    data: { emailVerifiedAt: new Date(), emailVerifyToken: null, emailVerifyExpiresAt: null },
  });

  return NextResponse.redirect(new URL("/sign-in?verified=1", req.url));
}
