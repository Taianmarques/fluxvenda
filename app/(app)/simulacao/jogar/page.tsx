import { ProductGate } from "../../ProductGate";
import { JogarClient } from "./JogarClient";

export default function JogarPage() {
  return (
    <ProductGate product="PLATAFORMA">
      <JogarClient />
    </ProductGate>
  );
}
