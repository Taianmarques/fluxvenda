import { OnboardingFlow } from "./OnboardingFlow";
import { PixelCadastro } from "@/app/PixelCadastro";

export default function OnboardingPage() {
  return (
    <>
      <PixelCadastro />
      <OnboardingFlow variant="generic" />
    </>
  );
}
