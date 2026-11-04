import { MetaPixel } from "@/app/formulario/[slug]/form-runtime";

// Meta Pixel do funil de cadastro (landing do CRM → /sign-up → onboarding). O ID é público
// (aparece no HTML), então fica aqui como padrão; META_PIXEL_ID no .env troca sem mexer no
// código. O StartTrial dispara no fim do onboarding (OnboardingFlow), via trackPixel.
const PIXEL_PADRAO = "1707270501037675";

export function PixelCadastro() {
  const id = (process.env.META_PIXEL_ID ?? PIXEL_PADRAO).trim();
  return id && /^\d{5,20}$/.test(id) ? <MetaPixel pixelId={id} /> : null;
}
