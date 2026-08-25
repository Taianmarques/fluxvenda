"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Target, MessageCircle, Lock, Code2, type LucideIcon } from "lucide-react";

const PLACEHOLDER = `Defina quem o agente é, como deve se comportar, o que pode e não pode fazer...

Exemplo:
Você é a Ana, assistente virtual da empresa XYZ.
Você ajuda clientes com dúvidas sobre nossos produtos.
Seja educada, objetiva e nunca invente informações.
Se não souber algo, diga que vai verificar com a equipe.`;

const QUICK_INSERTS: { label: string; icon: LucideIcon; heading: string }[] = [
  { label: "Persona", icon: User, heading: "Persona" },
  { label: "Objetivo", icon: Target, heading: "Objetivo" },
  { label: "Tom", icon: MessageCircle, heading: "Tom" },
  { label: "Restrições", icon: Lock, heading: "Restrições" },
  { label: "Exemplos", icon: Code2, heading: "Exemplos" },
];

export function InstrucoesPanel({ agentId, initialInstrucoesExtras }: { agentId: string; initialInstrucoesExtras: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState(initialInstrucoesExtras);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertHeading(heading: string) {
    const bloco = `${heading}:\n`;
    setTexto(prev => (prev.trim() ? `${prev.replace(/\n+$/, "")}\n\n${bloco}` : bloco));
    setSaved(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instrucoesExtras: texto }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      setError("Não foi possível salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap gap-2 p-4 border-b border-gray-800">
        {QUICK_INSERTS.map(q => (
          <button
            key={q.label}
            onClick={() => insertHeading(q.heading)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
          >
            <q.icon size={13} /> {q.label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        <textarea
          ref={textareaRef}
          value={texto}
          onChange={e => { setTexto(e.target.value); setSaved(false); }}
          placeholder={PLACEHOLDER}
          rows={16}
          maxLength={4000}
          className="w-full bg-transparent text-sm leading-relaxed focus:outline-none resize-none placeholder:text-gray-600"
        />

        <div className="flex items-center justify-between border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-600">Esse texto é anexado ao final das instruções que o agente já recebe de Personalidade, Sobre a empresa e Configuração comercial — não substitui, complementa.</p>
          <span className="text-xs text-gray-600 flex-shrink-0 ml-3">{texto.length}/4000</span>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-5 py-2 text-sm font-medium">
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {saved && <span className="text-sm text-green-400">Salvo!</span>}
        </div>
      </div>
    </div>
  );
}
