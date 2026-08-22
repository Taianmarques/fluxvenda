import { SignInForm } from "./SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; verified?: string }>;
}) {
  const { redirect_url, verified } = await searchParams;
  const redirectUrl = redirect_url && redirect_url.startsWith("/") ? redirect_url : "/dashboard";
  const initialNotice = verified === "1" ? "E-mail confirmado! Já pode entrar." : undefined;

  return <SignInForm redirectUrl={redirectUrl} initialNotice={initialNotice} />;
}
