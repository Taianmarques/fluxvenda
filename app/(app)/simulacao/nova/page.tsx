import { ProductGate } from "../../ProductGate";
import { NovaSimulacaoClient } from "./NovaSimulacaoClient";

export default function NovaSimulacaoPage() {
  return (
    <ProductGate product="PLATAFORMA">
      <NovaSimulacaoClient />
    </ProductGate>
  );
}
