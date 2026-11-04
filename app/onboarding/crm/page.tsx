import { OnboardingFlow } from "../OnboardingFlow";
import { PixelCadastro } from "@/app/PixelCadastro";

export default function OnboardingCrmPage() {
  return (
    <>
      <PixelCadastro />
      <OnboardingFlow variant="crm" />
    </>
  );
}
