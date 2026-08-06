import { ProductGate } from "../../../ProductGate";
import { ResultadoClient } from "./ResultadoClient";

export default function ResultadoPage() {
  return (
    <ProductGate product="PLATAFORMA">
      <ResultadoClient />
    </ProductGate>
  );
}
