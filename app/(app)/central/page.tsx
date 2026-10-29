import { redirect } from "next/navigation";

// A Central virou o produto "100 Prompts" dentro da Minha Biblioteca — links antigos continuam funcionando
export default function CentralAntiga() {
  redirect("/biblioteca/100-prompts-vendas");
}
