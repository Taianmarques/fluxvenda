import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { BibliotecaClient } from "../BibliotecaClient";
import { carregarCardsBiblioteca } from "../cards";

// Explorar Kits: a mesma vitrine da Minha Biblioteca, só com os kits que a pessoa ainda não tem
export default async function ExplorarKitsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return <BibliotecaClient produtos={await carregarCardsBiblioteca(user.id)} modo="explorar" />;
}
