import { SignUpForm } from "./SignUpForm";

// ?product=crm|plataforma vem das landing pages dedicadas (app/(marketing)/produtos/crm,
// app/(marketing)/produtos/plataforma) e manda pro onboarding específico de cada produto.
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product } = await searchParams;
  const validProduct = product === "crm" || product === "plataforma" ? product : null;
  const redirectUrl = validProduct ? `/onboarding/${validProduct}` : "/onboarding";

  return <SignUpForm redirectUrl={redirectUrl} />;
}
