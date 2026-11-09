"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

// Campo de senha com botão de mostrar/ocultar. A cor do ícone funciona em tela clara e escura.
export function CampoSenha(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [visivel, setVisivel] = useState(false);
  const rotulo = visivel ? "Ocultar senha" : "Mostrar senha";

  return (
    <div className="relative">
      <input
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...props}
        type={visivel ? "text" : "password"}
        style={{ ...props.style, paddingRight: "2.75rem" }}
      />
      <button
        type="button"
        onClick={() => setVisivel(v => !v)}
        title={rotulo}
        aria-label={rotulo}
        aria-pressed={visivel}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:opacity-70 transition-opacity"
      >
        {visivel ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
