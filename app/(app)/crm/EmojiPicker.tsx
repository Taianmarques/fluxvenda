"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import emojiData from "unicode-emoji-json/data-by-emoji.json";

type EmojiMeta = { name: string; slug: string; group: string; emoji_version: string; unicode_version: string; skin_tone_support: boolean };

const GROUP_ICON: Record<string, string> = {
  "Smileys & Emotion": "😊",
  "People & Body": "🤚",
  "Animals & Nature": "🐶",
  "Food & Drink": "🍔",
  "Travel & Places": "✈️",
  "Activities": "⚽",
  "Objects": "💡",
  "Symbols": "❤️",
  "Flags": "🏳️",
};

// Agrupa os ~1900 emojis do Unicode (mesma base que o WhatsApp usa) nas categorias oficiais,
// na ordem em que já vêm no dataset — computado uma única vez no carregamento do módulo.
const GROUPS: { group: string; emojis: string[] }[] = (() => {
  const order: string[] = [];
  const byGroup = new Map<string, string[]>();
  for (const [emoji, meta] of Object.entries(emojiData as Record<string, EmojiMeta>)) {
    if (!byGroup.has(meta.group)) { byGroup.set(meta.group, []); order.push(meta.group); }
    byGroup.get(meta.group)!.push(emoji);
  }
  return order.map(group => ({ group, emojis: byGroup.get(group)! }));
})();

const ALL_ENTRIES = Object.entries(emojiData as Record<string, EmojiMeta>);

// Os nomes do dataset são em inglês — traduz os termos de busca mais comuns pra o
// atendente conseguir digitar em português (ex: "fogo" -> também busca "fire").
const PT_TO_EN: Record<string, string[]> = {
  fogo: ["fire"], coracao: ["heart"], sorriso: ["smil", "grin"], feliz: ["smil", "happy", "joy"],
  triste: ["sad", "cry", "disappoint"], chorando: ["cry", "tear"], raiva: ["angry", "rage", "pout"],
  bravo: ["angry", "rage"], rindo: ["laugh", "joy", "tears of joy"], beijo: ["kiss"], amor: ["heart", "love"],
  surpreso: ["surpris", "astonish"], medo: ["fear", "scream"], sono: ["sleep", "yawn", "tired"],
  cansado: ["tired", "exhaust"], legal: ["cool", "thumbs up"], obrigado: ["folded hands", "pray"],
  mao: ["hand"], maos: ["hands"], polegar: ["thumbs"], aplaudir: ["clap"], aplausos: ["clap"],
  forca: ["muscle", "flex"], dedo: ["finger"], aceno: ["wav"], oi: ["wav"], tchau: ["wav"],
  ok: ["ok hand"], paz: ["victory", "peace"], dinheiro: ["money", "dollar", "cash"],
  cachorro: ["dog"], gato: ["cat"], cao: ["dog"], passaro: ["bird"], peixe: ["fish"],
  flor: ["flower", "blossom"], arvore: ["tree"], sol: ["sun"], lua: ["moon"], estrela: ["star"],
  chuva: ["rain", "cloud"], nuvem: ["cloud"], neve: ["snow"], raio: ["lightning", "high voltage"],
  pizza: ["pizza"], hamburguer: ["hamburger", "burger"], cafe: ["coffee"], cerveja: ["beer"],
  bolo: ["cake"], comida: ["food"], fruta: ["fruit"], maca: ["apple"], festa: ["party"],
  presente: ["gift", "present"], carro: ["car", "automobile"], aviao: ["airplane", "flight"],
  casa: ["house", "home"], relogio: ["clock", "watch"], telefone: ["phone", "telephone"],
  computador: ["computer", "laptop"], foguete: ["rocket"], bandeira: ["flag"], brasil: ["brazil"],
  check: ["check mark"], certo: ["check mark"], errado: ["cross mark"], atencao: ["warning"],
  pergunta: ["question"], exclamacao: ["exclamation"], documento: ["document", "page"],
  lapis: ["pencil"], livro: ["book"], musica: ["music", "note"], microfone: ["microphone"],
  video: ["video", "camera"], cadeado: ["lock"], chave: ["key"], trofeu: ["trophy"],
  medalha: ["medal"], bola: ["soccer", "ball"], futebol: ["soccer"], remedio: ["pill", "medicine"],
  hospital: ["hospital"], dente: ["tooth"], olho: ["eye"],
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function EmojiPicker({ onSelect, onClose, dark }: { onSelect: (emoji: string) => void; onClose: () => void; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeGroup, setActiveGroup] = useState(GROUPS[0].group);
  const [search, setSearch] = useState("");

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const visibleEmojis = useMemo(() => {
    const q = normalize(search.trim());
    if (!q) return GROUPS.find(g => g.group === activeGroup)?.emojis ?? [];
    const terms = [q, ...(PT_TO_EN[q] ?? [])];
    return ALL_ENTRIES
      .filter(([, meta]) => terms.some(term => normalize(meta.name).includes(term)))
      .map(([emoji]) => emoji);
  }, [search, activeGroup]);

  return (
    <div
      ref={ref}
      className={`absolute bottom-full left-0 mb-2 rounded-xl border shadow-xl z-10 w-80 flex flex-col ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}
    >
      <div className={`p-2 border-b ${dark ? "border-gray-800" : "border-gray-200"}`}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar emoji..."
          className={`w-full text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none ${dark ? "bg-gray-950 border-gray-700 text-white placeholder:text-gray-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"}`}
        />
      </div>

      {!search.trim() && (
        <div className={`flex items-center gap-0.5 px-1.5 py-1 border-b overflow-x-auto ${dark ? "border-gray-800" : "border-gray-200"}`}>
          {GROUPS.map(g => (
            <button
              key={g.group}
              onClick={() => setActiveGroup(g.group)}
              title={g.group}
              className={`flex-shrink-0 text-base p-1 rounded-lg ${activeGroup === g.group ? (dark ? "bg-gray-800" : "bg-gray-100") : "opacity-60 hover:opacity-100"}`}
            >
              {GROUP_ICON[g.group] ?? "•"}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2" style={{ maxHeight: 260 }}>
        {visibleEmojis.length === 0 ? (
          <p className={`text-xs text-center py-6 ${dark ? "text-gray-500" : "text-gray-400"}`}>Nenhum emoji encontrado.</p>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {visibleEmojis.map(emoji => (
              <button
                key={emoji}
                onClick={() => onSelect(emoji)}
                title={(emojiData as Record<string, EmojiMeta>)[emoji]?.name}
                className={`text-lg p-1 rounded transition-colors ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
