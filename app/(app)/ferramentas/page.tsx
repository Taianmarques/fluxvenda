import { redirect } from "next/navigation";

// /ferramentas foi descontinuada — a criação e configuração de agentes agora
// vive inteiramente dentro do CRM (menu próprio, sem a casca da Plataforma).
// Mantido como redirect pra não quebrar links/favoritos antigos.
export default function FerramentasPage() {
  redirect("/crm");
}
