import { ProductGate } from "../ProductGate";
import { ObjecoesClient } from "./ObjecoesClient";

export default function ObjecoesPage() {
  return (
    <ProductGate product="PLATAFORMA">
      <ObjecoesClient />
    </ProductGate>
  );
}
