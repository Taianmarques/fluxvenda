import { EsqueciSenhaForm } from "./EsqueciSenhaForm";
import { TemaAuth } from "../TemaAuth";

export default async function EsqueciSenhaPage({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return (
    <TemaAuth vendasIA={tema === "vi"}>
      <EsqueciSenhaForm vendasIA={tema === "vi"} />
    </TemaAuth>
  );
}
