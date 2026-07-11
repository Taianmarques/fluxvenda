"use client";

import { useState } from "react";
import { Phone, Eye, EyeOff, Save, CheckCircle, Mic } from "lucide-react";

type PhoneConfig = {
  phoneEnabled: boolean;
  whatsappVoiceEnabled: boolean;
  whatsappVoicePercent: number;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  elevenlabsApiKey: string;
  elevenlabsVoiceId: string;
  phoneCallPrompt: string;
};

export function PhoneAgentClient({
  agentId,
  initialConfig,
}: {
  agentId: string;
  initialConfig: PhoneConfig;
}) {
  const [cfg, setCfg] = useState<PhoneConfig>(initialConfig);
  const [showSid, setShowSid] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [showElKey, setShowElKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof PhoneConfig, value: string | boolean | number) {
    setCfg(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/phone-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao salvar");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const showElevenLabs = cfg.phoneEnabled || cfg.whatsappVoiceEnabled;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center gap-3">
          <Phone size={18} className="text-blue-400" />
          <div>
            <p className="font-semibold">Voz de IA (ElevenLabs)</p>
            <p className="text-xs text-gray-500">Respostas em áudio via ElevenLabs — para ligações (Twilio) e/ou WhatsApp</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Phone size={14} className="text-gray-400" />
            <span className="text-sm text-gray-400">Ligação (Twilio)</span>
            <button
              type="button"
              onClick={() => set("phoneEnabled", !cfg.phoneEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfg.phoneEnabled ? "bg-blue-600" : "bg-gray-700"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg.phoneEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Mic size={14} className="text-gray-400" />
            <span className="text-sm text-gray-400">Áudio no WhatsApp</span>
            <button
              type="button"
              onClick={() => set("whatsappVoiceEnabled", !cfg.whatsappVoiceEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${cfg.whatsappVoiceEnabled ? "bg-green-600" : "bg-gray-700"}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${cfg.whatsappVoiceEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </label>
        </div>
      </div>

      {showElevenLabs && (
        <div className="p-6 space-y-6">
          {/* ElevenLabs */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-300">ElevenLabs (voz da IA)</p>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showElKey ? "text" : "password"}
                    value={cfg.elevenlabsApiKey}
                    onChange={e => set("elevenlabsApiKey", e.target.value)}
                    placeholder="xi_••••••••••••••••"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm pr-10 focus:outline-none focus:border-blue-600"
                  />
                  <button type="button" onClick={() => setShowElKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showElKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Voice ID</label>
                <input
                  type="text"
                  value={cfg.elevenlabsVoiceId}
                  onChange={e => set("elevenlabsVoiceId", e.target.value)}
                  placeholder="EXAVITQu4vr4xnSDxMaL"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                />
                <p className="text-[10px] text-gray-600 mt-1">Deixe vazio para usar a voz padrão "Bella". Encontre o ID em elevenlabs.io/voices</p>
              </div>
            </div>
          </div>

          {/* Porcentagem de áudio — só quando "Áudio no WhatsApp" habilitado */}
          {cfg.whatsappVoiceEnabled && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-300 flex items-center justify-between">
                <span>Chance de responder em áudio</span>
                <span className="text-green-400">{cfg.whatsappVoicePercent}%</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={cfg.whatsappVoicePercent}
                onChange={e => set("whatsappVoicePercent", Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <p className="text-[10px] text-gray-600">
                Cada resposta do agente sai OU em áudio OU em texto, nunca os dois. {cfg.whatsappVoicePercent}% das respostas saem como áudio; o restante, como texto.
              </p>
            </div>
          )}

          {/* Twilio — só quando ligação habilitada */}
          {cfg.phoneEnabled && (
            <>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-300">Twilio</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Account SID</label>
                    <div className="relative">
                      <input
                        type={showSid ? "text" : "password"}
                        value={cfg.twilioAccountSid}
                        onChange={e => set("twilioAccountSid", e.target.value)}
                        placeholder="ACxxxxxxxxxxxxxxxx"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm pr-10 focus:outline-none focus:border-blue-600"
                      />
                      <button type="button" onClick={() => setShowSid(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showSid ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Auth Token</label>
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        value={cfg.twilioAuthToken}
                        onChange={e => set("twilioAuthToken", e.target.value)}
                        placeholder="••••••••••••••••••"
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm pr-10 focus:outline-none focus:border-blue-600"
                      />
                      <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Número Twilio (origem das ligações)</label>
                    <input
                      type="tel"
                      value={cfg.twilioPhoneNumber}
                      onChange={e => set("twilioPhoneNumber", e.target.value)}
                      placeholder="+5511999999999"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-300 block">Instruções para ligações (opcional)</label>
                <textarea
                  value={cfg.phoneCallPrompt}
                  onChange={e => set("phoneCallPrompt", e.target.value)}
                  rows={3}
                  placeholder="Ex: O objetivo desta ligação é agendar uma reunião de demonstração. Só pergunte disponibilidade após apresentar brevemente o produto..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-blue-300">Configure no Twilio</p>
                <p className="text-xs text-gray-400">
                  Voice webhook URL:{" "}
                  <code className="bg-gray-900 px-1.5 py-0.5 rounded text-blue-300 text-[11px]">
                    {`{APP_URL}/api/webhooks/twilio/${agentId}/voice`}
                  </code>
                </p>
                <p className="text-xs text-gray-400">
                  Status callback:{" "}
                  <code className="bg-gray-900 px-1.5 py-0.5 rounded text-blue-300 text-[11px]">
                    {`{APP_URL}/api/webhooks/twilio/${agentId}/status`}
                  </code>
                </p>
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar configurações"}
          </button>
        </div>
      )}

      {!showElevenLabs && (
        <div className="px-6 py-4 text-xs text-gray-600">
          Ative uma das opções acima para configurar as credenciais.
        </div>
      )}
    </div>
  );
}
