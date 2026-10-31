import Image from "next/image";
import { BarChart3 } from "lucide-react";

// Wordmark pra fundo claro — o logoflux.png é a variante "negativa" (texto
// branco), só funciona em fundo escuro. Aqui recriamos o texto em CSS ao lado
// do ícone (que é colorido e funciona em qualquer fundo).
// vendasIA: marca do Vendas IA (fundo escuro, mesma do menu da área logada)
export function AuthLogo({ size = 40, vendasIA = false }: { size?: number; vendasIA?: boolean }) {
  if (vendasIA) {
    return (
      <div className="flex items-center justify-center gap-2.5">
        <span className="rounded-xl bg-[linear-gradient(135deg,#fff1c2,#fbbf24_55%,#f59e0b)] flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(251,191,36,.6)]" style={{ width: size, height: size }}>
          <BarChart3 size={size * 0.52} className="text-[#2b1b02]" />
        </span>
        <span className="font-semibold tracking-tight text-[#edebe6]" style={{ fontSize: size * 0.6 }}>
          Vendas <span className="text-[#fbbf24]">IA</span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-2">
      <Image src="/iconefluxvenda.png" alt="" width={size} height={size} priority />
      <span className="font-extrabold tracking-tight text-gray-900" style={{ fontSize: size * 0.6 }}>
        <span className="italic">Flux</span>Venda
      </span>
    </div>
  );
}
