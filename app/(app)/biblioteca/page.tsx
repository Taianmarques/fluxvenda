import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { BibliotecaClient } from "./BibliotecaClient";
import { carregarCardsBiblioteca } from "./cards";

// Minha Biblioteca: os infoprodutos que o usuário tem e a vitrine dos que ainda pode adquirir.
export default async function BibliotecaPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return <BibliotecaClient produtos={await carregarCardsBiblioteca(user.id)} />;
}
