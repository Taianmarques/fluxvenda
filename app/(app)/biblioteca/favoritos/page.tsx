import { redirect } from "next/navigation";

// Antigo "Meus Prompts" — agora é a aba Prompts da página Favoritos
export default function MeusPromptsPage() {
  redirect("/favoritos?aba=prompts");
}
