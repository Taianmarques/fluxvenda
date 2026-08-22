import Image from "next/image";

// Wordmark pra fundo claro — o logoflux.png é a variante "negativa" (texto
// branco), só funciona em fundo escuro. Aqui recriamos o texto em CSS ao lado
// do ícone (que é colorido e funciona em qualquer fundo).
export function AuthLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Image src="/iconefluxvenda.png" alt="" width={size} height={size} priority />
      <span className="font-extrabold tracking-tight text-gray-900" style={{ fontSize: size * 0.6 }}>
        <span className="italic">Flux</span>Venda
      </span>
    </div>
  );
}
