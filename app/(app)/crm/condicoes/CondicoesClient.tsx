"use client";

import { useState } from "react";
import {
  GitBranch, Plus, X, ChevronUp, ChevronDown, GripVertical,
  Trash2, ToggleLeft, ToggleRight, Instagram, MessageSquare,
  Clock, HelpCircle, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CommentFlow = {
  id: string;
  name: string;
  keywords: string[];
  replyMessage: string;
  funnelId: string | null;
  order: number;
  active: boolean;
};

type Branch = { keywords: string[]; label: string; funnelId: string | null };

type FunnelBlock = {
  id: string; // local ID
  type: "MESSAGE" | "DELAY" | "CONDITION";
  order: number;
  content?: string;
  delayMinutes?: number;
  branches?: Branch[];
};

type Funnel = {
  id: string; // real DB id or "new_xxx"
  name: string;
  active: boolean;
  dmTriggerEnabled: boolean;
  dmTriggerKeywords: string[];
  blocks: FunnelBlock[];
};

type Props = {
  agentId: string;
  igConnected: boolean;
  igUsername: string | null;
  igCommentAutoDm: boolean;
  igCommentDmMessage: string | null;
  initialFlows: CommentFlow[];
  initialFunnels: Funnel[];
};

type KwInputState = Record<string, string>; // funnelId → current input value

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newBlockId() { return `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }
function newFlowId() { return `flow_${Date.now()}`; }
function newFunnelId() { return `new_${Date.now()}`; }

const BLOCK_LABELS: Record<FunnelBlock["type"], string> = {
  MESSAGE: "Mensagem",
  DELAY: "Espera",
  CONDITION: "Condição",
};
const BLOCK_ICONS: Record<FunnelBlock["type"], React.FC<any>> = {
  MESSAGE: MessageSquare,
  DELAY: Clock,
  CONDITION: HelpCircle,
};
const BLOCK_COLORS: Record<FunnelBlock["type"], string> = {
  MESSAGE: "text-blue-400 bg-blue-900/30 border-blue-800/50",
  DELAY: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50",
  CONDITION: "text-purple-400 bg-purple-900/30 border-purple-800/50",
};

// ─── Block component ──────────────────────────────────────────────────────────

function BlockCard({
  block, index, total, funnels,
  onUpdate, onDelete, onMoveUp, onMoveDown,
}: {
  block: FunnelBlock;
  index: number;
  total: number;
  funnels: Funnel[];
  onUpdate: (patch: Partial<FunnelBlock>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [branchKwInput, setBranchKwInput] = useState<Record<number, string>>({});
  const Icon = BLOCK_ICONS[block.type];
  const colorCls = BLOCK_COLORS[block.type];

  function updateBranch(i: number, patch: Partial<Branch>) {
    const branches = [...(block.branches ?? [])];
    branches[i] = { ...branches[i], ...patch };
    onUpdate({ branches });
  }
  function addBranch() {
    onUpdate({ branches: [...(block.branches ?? []), { keywords: [], label: `Opção ${(block.branches?.length ?? 0) + 1}`, funnelId: null }] });
  }
  function deleteBranch(i: number) {
    const branches = [...(block.branches ?? [])];
    branches.splice(i, 1);
    onUpdate({ branches });
  }
  function addBranchKw(branchIdx: number) {
    const kw = (branchKwInput[branchIdx] ?? "").trim().toLowerCase();
    if (!kw) return;
    const branches = [...(block.branches ?? [])];
    if (!branches[branchIdx].keywords.includes(kw)) {
      branches[branchIdx] = { ...branches[branchIdx], keywords: [...branches[branchIdx].keywords, kw] };
      onUpdate({ branches });
    }
    setBranchKwInput((p) => ({ ...p, [branchIdx]: "" }));
  }
  function removeBranchKw(branchIdx: number, kw: string) {
    const branches = [...(block.branches ?? [])];
    branches[branchIdx] = { ...branches[branchIdx], keywords: branches[branchIdx].keywords.filter((k) => k !== kw) };
    onUpdate({ branches });
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/70 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/60">
        <div className="flex flex-col gap-0 flex-shrink-0">
          <button onClick={onMoveUp} disabled={index === 0} className="text-gray-600 hover:text-gray-300 disabled:opacity-20"><ChevronUp size={12} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-600 hover:text-gray-300 disabled:opacity-20"><ChevronDown size={12} /></button>
        </div>
        <GripVertical size={12} className="text-gray-700" />
        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full border ${colorCls}`}>
          <Icon size={11} />
          {BLOCK_LABELS[block.type]}
        </span>
        <div className="flex-1" />
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
      </div>

      {/* Body */}
      <div className="px-3 py-3 space-y-2.5">
        {block.type === "MESSAGE" && (
          <textarea
            value={block.content ?? ""}
            onChange={(e) => onUpdate({ content: e.target.value })}
            rows={2}
            placeholder="Texto da mensagem enviada no DM..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 resize-none"
          />
        )}

        {block.type === "DELAY" && (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={block.delayMinutes ?? 60}
              onChange={(e) => onUpdate({ delayMinutes: Math.max(1, Number(e.target.value)) })}
              className="w-24 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:border-yellow-600"
            />
            <span className="text-sm text-gray-400">minutos de espera antes do próximo bloco</span>
          </div>
        )}

        {block.type === "CONDITION" && (
          <div className="space-y-3">
            <textarea
              value={block.content ?? ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              rows={2}
              placeholder="Pergunta enviada ao contato (ex: Você quer saber mais sobre preços ou sobre entrega?)..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-600 resize-none"
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400">Ramificações — a primeira que bater define o próximo funil</p>

              {(block.branches ?? []).map((branch, bi) => (
                <div key={bi} className="border border-gray-800 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-5 text-center font-bold">{bi + 1}</span>
                    <input
                      type="text"
                      value={branch.label}
                      onChange={(e) => updateBranch(bi, { label: e.target.value })}
                      placeholder="Nome da opção"
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-600"
                    />
                    <button onClick={() => deleteBranch(bi)} className="text-gray-600 hover:text-red-400"><X size={12} /></button>
                  </div>

                  {/* Keywords da branch */}
                  <div className="flex flex-wrap gap-1 pl-7">
                    {branch.keywords.map((kw) => (
                      <span key={kw} className="flex items-center gap-1 text-xs bg-purple-900/20 text-purple-400 border border-purple-800/30 rounded-full px-2 py-0.5">
                        {kw}
                        <button onClick={() => removeBranchKw(bi, kw)}><X size={8} /></button>
                      </span>
                    ))}
                    {branch.keywords.length === 0 && <span className="text-xs text-gray-600 italic">vazio = catch-all</span>}
                  </div>
                  <div className="flex gap-1.5 pl-7">
                    <input
                      type="text"
                      value={branchKwInput[bi] ?? ""}
                      onChange={(e) => setBranchKwInput((p) => ({ ...p, [bi]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBranchKw(bi); } }}
                      placeholder="palavra-chave..."
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-600"
                    />
                    <button onClick={() => addBranchKw(bi)} className="text-xs text-purple-400 border border-purple-800/50 rounded-lg px-2 py-1">+ Add</button>
                  </div>

                  {/* Funil destino */}
                  <div className="pl-7">
                    <select
                      value={branch.funnelId ?? ""}
                      onChange={(e) => updateBranch(bi, { funnelId: e.target.value || null })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-600"
                    >
                      <option value="">— Encerrar funil —</option>
                      {funnels.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}

              <button
                onClick={addBranch}
                className="w-full text-xs text-purple-400 hover:text-purple-300 border border-dashed border-purple-800/40 rounded-lg py-1.5 transition-colors"
              >
                + Nova ramificação
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Funnel builder ───────────────────────────────────────────────────────────

function FunnelBuilder({ funnel, allFunnels, onUpdate, onDelete }: {
  funnel: Funnel;
  allFunnels: Funnel[];
  onUpdate: (patch: Partial<Funnel>) => void;
  onDelete: () => void;
}) {
  const [dmKwInput, setDmKwInput] = useState("");
  function updateBlock(id: string, patch: Partial<FunnelBlock>) {
    onUpdate({ blocks: funnel.blocks.map((b) => b.id === id ? { ...b, ...patch } : b) });
  }
  function deleteBlock(id: string) {
    onUpdate({ blocks: funnel.blocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, order: i })) });
  }
  function moveBlock(from: number, to: number) {
    const next = [...funnel.blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onUpdate({ blocks: next.map((b, i) => ({ ...b, order: i })) });
  }
  function addBlock(type: FunnelBlock["type"]) {
    onUpdate({
      blocks: [...funnel.blocks, {
        id: newBlockId(),
        type,
        order: funnel.blocks.length,
        content: type === "DELAY" ? undefined : "",
        delayMinutes: type === "DELAY" ? 60 : undefined,
        branches: type === "CONDITION" ? [] : undefined,
      }],
    });
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Funnel header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/60">
        <Zap size={15} className="text-yellow-400" />
        <input
          type="text"
          value={funnel.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Nome do funil"
          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder:text-gray-600"
        />
        <button
          onClick={() => onUpdate({ active: !funnel.active })}
          className={`transition-colors ${funnel.active ? "text-green-400 hover:text-green-300" : "text-gray-600 hover:text-gray-400"}`}
          title={funnel.active ? "Ativo" : "Inativo"}
        >
          {funnel.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        </button>
        <button onClick={onDelete} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
      </div>

      {/* Blocks */}
      <div className="px-4 py-4 space-y-2.5">
        {funnel.blocks.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-3">Nenhum bloco. Adicione abaixo.</p>
        )}
        {funnel.blocks.map((block, i) => (
          <BlockCard
            key={block.id}
            block={block}
            index={i}
            total={funnel.blocks.length}
            funnels={allFunnels.filter((f) => f.id !== funnel.id)}
            onUpdate={(patch) => updateBlock(block.id, patch)}
            onDelete={() => deleteBlock(block.id)}
            onMoveUp={() => moveBlock(i, i - 1)}
            onMoveDown={() => moveBlock(i, i + 1)}
          />
        ))}

        {/* Add block buttons */}
        <div className="flex gap-2 pt-1 flex-wrap">
          {(["MESSAGE", "DELAY", "CONDITION"] as FunnelBlock["type"][]).map((type) => {
            const Icon = BLOCK_ICONS[type];
            const colorCls = BLOCK_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className={`flex items-center gap-1.5 text-xs border rounded-lg px-3 py-1.5 transition-colors ${colorCls} hover:opacity-80`}
              >
                <Icon size={12} />
                + {BLOCK_LABELS[type]}
              </button>
            );
          })}
        </div>

        {/* Gatilho de DM */}
        <div className="border-t border-gray-800/60 pt-3 space-y-2.5 mt-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-300">Gatilho de DM direto</p>
              <p className="text-xs text-gray-500 mt-0.5">Dispara este funil quando alguém enviar uma mensagem no direct</p>
            </div>
            <button
              onClick={() => onUpdate({ dmTriggerEnabled: !funnel.dmTriggerEnabled })}
              className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${funnel.dmTriggerEnabled ? "bg-green-600" : "bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${funnel.dmTriggerEnabled ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>

          {funnel.dmTriggerEnabled && (
            <div className="space-y-1.5 pl-0">
              <p className="text-xs text-gray-500">
                Palavras-chave da mensagem
                <span className="text-gray-600 ml-1">(vazio = qualquer mensagem)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {funnel.dmTriggerKeywords.map((kw) => (
                  <span key={kw} className="flex items-center gap-1 text-xs bg-green-900/30 text-green-300 border border-green-800/40 rounded-full px-2.5 py-0.5">
                    {kw}
                    <button
                      onClick={() => onUpdate({ dmTriggerKeywords: funnel.dmTriggerKeywords.filter((k) => k !== kw) })}
                    >
                      <X size={9} />
                    </button>
                  </span>
                ))}
                {funnel.dmTriggerKeywords.length === 0 && (
                  <span className="text-xs text-gray-600 italic">Qualquer mensagem no direct dispara este funil</span>
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={dmKwInput}
                  onChange={(e) => setDmKwInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const kw = dmKwInput.trim().toLowerCase();
                      if (kw && !funnel.dmTriggerKeywords.includes(kw)) {
                        onUpdate({ dmTriggerKeywords: [...funnel.dmTriggerKeywords, kw] });
                      }
                      setDmKwInput("");
                    }
                  }}
                  placeholder="Ex: oi, quero, info..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-green-600"
                />
                <button
                  onClick={() => {
                    const kw = dmKwInput.trim().toLowerCase();
                    if (kw && !funnel.dmTriggerKeywords.includes(kw)) {
                      onUpdate({ dmTriggerKeywords: [...funnel.dmTriggerKeywords, kw] });
                    }
                    setDmKwInput("");
                  }}
                  className="text-xs text-green-400 border border-green-800/50 rounded-lg px-2.5 py-1.5 hover:border-green-600/50 transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Flow card (conditions tab) ───────────────────────────────────────────────

function FlowCard({
  flow, index, total, funnels,
  onUpdate, onDelete, onMoveUp, onMoveDown,
}: {
  flow: CommentFlow;
  index: number;
  total: number;
  funnels: Funnel[];
  onUpdate: (patch: Partial<CommentFlow>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [kwInput, setKwInput] = useState("");

  function addKw() {
    const kw = kwInput.trim().toLowerCase();
    if (!kw || flow.keywords.includes(kw)) return;
    onUpdate({ keywords: [...flow.keywords, kw] });
    setKwInput("");
  }

  return (
    <div className={`rounded-xl border transition-opacity ${flow.active ? "border-gray-700 bg-gray-900/60" : "border-gray-800 bg-gray-950/40 opacity-60"}`}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60">
        <div className="flex flex-col gap-0 flex-shrink-0">
          <button onClick={onMoveUp} disabled={index === 0} className="text-gray-600 hover:text-gray-300 disabled:opacity-20"><ChevronUp size={13} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="text-gray-600 hover:text-gray-300 disabled:opacity-20"><ChevronDown size={13} /></button>
        </div>
        <GripVertical size={14} className="text-gray-700" />
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-900/40 border border-purple-800/40 flex items-center justify-center">
          <span className="text-xs text-purple-400 font-bold">{index + 1}</span>
        </div>
        <input
          type="text"
          value={flow.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Nome da condição"
          className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-gray-600 min-w-0"
        />
        <button
          onClick={() => onUpdate({ active: !flow.active })}
          className={`flex-shrink-0 transition-colors ${flow.active ? "text-purple-400" : "text-gray-600"}`}
        >
          {flow.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        </button>
        <button onClick={onDelete} className="flex-shrink-0 text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Keywords */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400">
            Palavras-chave
            <span className="text-gray-600 font-normal ml-1.5">(vazio = qualquer comentário)</span>
          </p>
          <div className="flex flex-wrap gap-1.5 min-h-[20px]">
            {flow.keywords.map((kw) => (
              <span key={kw} className="flex items-center gap-1 text-xs bg-purple-900/30 text-purple-300 border border-purple-800/40 rounded-full px-2.5 py-0.5">
                {kw}
                <button onClick={() => onUpdate({ keywords: flow.keywords.filter((k) => k !== kw) })}><X size={9} /></button>
              </span>
            ))}
            {flow.keywords.length === 0 && <span className="text-xs text-gray-600 italic">Qualquer comentário ativa esta condição</span>}
          </div>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={kwInput}
              onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(); } }}
              placeholder="Ex: info, preço, quero..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-600"
            />
            <button onClick={addKw} className="text-xs text-purple-400 border border-purple-800/50 rounded-lg px-3 py-1.5">+ Add</button>
          </div>
        </div>

        {/* Ação */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-400">Ação ao comentar</p>
          <div className="flex gap-2">
            <button
              onClick={() => onUpdate({ funnelId: null })}
              className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border transition-colors ${
                !flow.funnelId ? "bg-blue-900/30 border-blue-700 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              <MessageSquare size={12} />
              Mensagem direta
            </button>
            <button
              onClick={() => {
                if (funnels.length > 0) onUpdate({ funnelId: funnels[0].id });
              }}
              disabled={funnels.length === 0}
              className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border transition-colors disabled:opacity-40 ${
                flow.funnelId ? "bg-yellow-900/30 border-yellow-700 text-yellow-300" : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              <Zap size={12} />
              Iniciar funil
            </button>
          </div>

          {!flow.funnelId ? (
            <textarea
              value={flow.replyMessage}
              onChange={(e) => onUpdate({ replyMessage: e.target.value })}
              rows={2}
              placeholder="Mensagem enviada no DM..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 resize-none"
            />
          ) : (
            <select
              value={flow.funnelId}
              onChange={(e) => onUpdate({ funnelId: e.target.value })}
              className="w-full bg-gray-800 border border-yellow-800/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-600"
            >
              {funnels.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CondicoesClient({ agentId, igConnected, igUsername, igCommentAutoDm, igCommentDmMessage, initialFlows, initialFunnels }: Props) {
  const [tab, setTab] = useState<"condicoes" | "funis">("condicoes");

  // ── Conditions state ──
  const [autoDm, setAutoDm] = useState(igCommentAutoDm);
  const [fallback, setFallback] = useState(igCommentDmMessage ?? "");
  const [flows, setFlows] = useState<CommentFlow[]>(initialFlows);
  const [savingFlows, setSavingFlows] = useState(false);
  const [savedFlows, setSavedFlows] = useState(false);

  // ── Funnels state ──
  const [funnels, setFunnels] = useState<Funnel[]>(initialFunnels);
  const [savingFunnels, setSavingFunnels] = useState(false);
  const [savedFunnels, setSavedFunnels] = useState(false);

  const [error, setError] = useState("");

  // ── Flow helpers ──
  function updateFlow(id: string, patch: Partial<CommentFlow>) {
    setFlows((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }
  function moveFlow(from: number, to: number) {
    const next = [...flows];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setFlows(next.map((f, i) => ({ ...f, order: i })));
  }
  function addFlow() {
    setFlows((prev) => [...prev, { id: newFlowId(), name: `Condição ${prev.length + 1}`, keywords: [], replyMessage: "", funnelId: null, order: prev.length, active: true }]);
  }

  // ── Funnel helpers ──
  function updateFunnel(id: string, patch: Partial<Funnel>) {
    setFunnels((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }

  async function saveFlows() {
    setSavingFlows(true); setError(""); setSavedFlows(false);
    try {
      const res = await fetch(`/api/instagram/comment-flows/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ igCommentAutoDm: autoDm, igCommentDmMessage: fallback.trim() || null, flows: flows.map((f, i) => ({ ...f, order: i })) }),
      });
      if (!res.ok) throw new Error();
      setSavedFlows(true); setTimeout(() => setSavedFlows(false), 2500);
    } catch { setError("Erro ao salvar condições."); }
    finally { setSavingFlows(false); }
  }

  async function saveFunnels() {
    setSavingFunnels(true); setError(""); setSavedFunnels(false);
    try {
      const res = await fetch(`/api/instagram/funnels/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ funnels: funnels.map((f) => ({ id: f.id.startsWith("new_") ? undefined : f.id, tempId: f.id, name: f.name, active: f.active, dmTriggerEnabled: f.dmTriggerEnabled, dmTriggerKeywords: f.dmTriggerKeywords, blocks: f.blocks })) }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      // Sync IDs: replace temp IDs with real IDs from server
      const idMap: Record<string, string> = {};
      for (const item of data.funnels ?? []) {
        if (item.tempId && item.tempId !== item.realId) idMap[item.tempId] = item.realId;
      }
      if (Object.keys(idMap).length > 0) {
        setFunnels((prev) => prev.map((f) => idMap[f.id] ? { ...f, id: idMap[f.id] } : f));
        setFlows((prev) => prev.map((f) => f.funnelId && idMap[f.funnelId] ? { ...f, funnelId: idMap[f.funnelId] } : f));
      }
      setSavedFunnels(true); setTimeout(() => setSavedFunnels(false), 2500);
    } catch { setError("Erro ao salvar funis."); }
    finally { setSavingFunnels(false); }
  }

  if (!igConnected) {
    return (
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Instagram size={36} className="mx-auto text-gray-600" />
          <p className="font-medium text-gray-400">Instagram não conectado</p>
          <p className="text-sm text-gray-600">
            Conecte em{" "}
            <a href="../canais" className="text-purple-400 hover:underline">Canais</a>{" "}
            para configurar automações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-6">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <GitBranch className="text-purple-400" size={24} />
            <div>
              <h1 className="text-2xl font-bold">Condições</h1>
              <p className="text-xs text-gray-500">Automações de comentário → DM no Instagram</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400">Auto-DM</span>
            <button
              onClick={() => setAutoDm((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${autoDm ? "bg-purple-600" : "bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoDm ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>

        {/* Conta */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-900/20 border border-purple-800/40 rounded-xl">
          <Instagram size={14} className="text-purple-400" />
          <span className="text-sm text-purple-300">@{igUsername}</span>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-300 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")}><X size={14} /></button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          {([["condicoes", "Condições"], ["funis", "Funis"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${tab === key ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Tab: Condições ── */}
        {tab === "condicoes" && (
          <div className="space-y-3">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Como funciona</p>
              <ol className="text-xs text-gray-500 space-y-0.5 list-decimal list-inside">
                <li>Alguém comenta num post → sistema verifica condições na ordem</li>
                <li>Primeira que bater: envia mensagem direta ou inicia um funil</li>
                <li>Se nenhuma bater: usa o fallback abaixo</li>
              </ol>
            </div>

            {flows.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhuma condição. Adicione abaixo.</p>}

            {flows.map((flow, i) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                index={i}
                total={flows.length}
                funnels={funnels}
                onUpdate={(patch) => updateFlow(flow.id, patch)}
                onDelete={() => setFlows((prev) => prev.filter((f) => f.id !== flow.id))}
                onMoveUp={() => moveFlow(i, i - 1)}
                onMoveDown={() => moveFlow(i, i + 1)}
              />
            ))}

            <button
              onClick={addFlow}
              className="w-full flex items-center justify-center gap-2 text-sm text-purple-400 hover:text-purple-300 border border-dashed border-purple-800/50 hover:border-purple-600/50 rounded-xl py-3 transition-colors"
            >
              <Plus size={15} />
              Nova condição
            </button>

            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-4 space-y-2">
              <div>
                <p className="text-sm font-medium">Fallback</p>
                <p className="text-xs text-gray-500 mt-0.5">Quando nenhuma condição bate. Vazio = IA responde.</p>
              </div>
              <textarea
                value={fallback}
                onChange={(e) => setFallback(e.target.value)}
                rows={2}
                placeholder="Deixe vazio para o agente de IA responder..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              {savedFlows ? <p className="text-sm text-green-400">Salvo</p> : <span />}
              <button onClick={saveFlows} disabled={savingFlows} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-6 py-2.5">
                {savingFlows ? "Salvando..." : "Salvar condições"}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Funis ── */}
        {tab === "funis" && (
          <div className="space-y-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 space-y-0.5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Blocos disponíveis</p>
              <div className="flex gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-blue-400"><MessageSquare size={11} /> Mensagem — envia DM instantaneamente</span>
                <span className="flex items-center gap-1 text-xs text-yellow-400"><Clock size={11} /> Espera — pausa N minutos antes do próximo bloco</span>
                <span className="flex items-center gap-1 text-xs text-purple-400"><HelpCircle size={11} /> Condição — pergunta e ramifica por resposta</span>
              </div>
            </div>

            {funnels.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhum funil. Crie abaixo.</p>}

            {funnels.map((funnel) => (
              <FunnelBuilder
                key={funnel.id}
                funnel={funnel}
                allFunnels={funnels}
                onUpdate={(patch) => updateFunnel(funnel.id, patch)}
                onDelete={() => setFunnels((prev) => prev.filter((f) => f.id !== funnel.id))}
              />
            ))}

            <button
              onClick={() => setFunnels((prev) => [...prev, { id: newFunnelId(), name: `Funil ${prev.length + 1}`, active: true, dmTriggerEnabled: false, dmTriggerKeywords: [], blocks: [] }])}
              className="w-full flex items-center justify-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 border border-dashed border-yellow-800/50 hover:border-yellow-600/50 rounded-xl py-3 transition-colors"
            >
              <Plus size={15} />
              Novo funil
            </button>

            <div className="flex items-center justify-between">
              {savedFunnels ? <p className="text-sm text-green-400">Salvo</p> : <span />}
              <button onClick={saveFunnels} disabled={savingFunnels} className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl px-6 py-2.5">
                {savingFunnels ? "Salvando..." : "Salvar funis"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
