import { ProductGate } from "../ProductGate";
import { ScriptsClient } from "./ScriptsClient";

export default function ScriptsPage() {
  return (
    <ProductGate product="PLATAFORMA">
      <ScriptsClient />
    </ProductGate>
  );
}
