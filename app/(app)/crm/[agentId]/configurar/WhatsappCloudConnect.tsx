"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, Globe2, Eye, EyeOff, Save, CheckCircle, Wand2, Copy, Check } from "lucide-react";
import { QrConnect } from "./QrConnect";

type CloudConfig = {
  whatsappProvider: "UAZAPI" | "CLOUD_API";
  cloudApiPhoneNumberId: string;
  cloudApiWabaId: string;
  cloudApiAccessToken: string;
  cloudApiVerifyToken: string;
  cloudApiPhoneNumber: string;
  cloudApiVerifiedName: string;
};

export function WhatsappCloudConnect({
  agentId,
  appUrl,
  initialConfig,
}: {
  agentId: string;
  appUrl: string;
  initialConfig: CloudConfig;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<"UAZAPI" | "CLOUD_API">(initialConfig.whatsappProvider);
  const [cfg, setCfg] = useState(initialConfig);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ displayPhoneNumber: string; verifiedName: string } | null>(
    initialConfig.cloudApiPhoneNumber ? { displayPhoneNumber: initialConfig.cloudApiPhoneNumber, verifiedName: initialConfig.cloudApiVerifiedName } : null
  );
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"url" | "token" | null>(null);

  function set(key: keyof CloudConfig, value: string) {
    setCfg(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/whatsapp-cloud-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...cfg, whatsappProvider: provider }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao salvar");
      const data = await res.json();
      setCfg(prev => ({ ...prev, cloudApiVerifyToken: data.cloudApiVerifyToken ?? prev.cloudApiVerifyToken }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setError("");
    setTestResult(null);
    try {
      const res = await fetch(`/api/agentes/${agentId}/whatsapp-cloud/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao testar conexão");
      setTestResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  }

  function copy(what: "url" | "token", value: string) {
    navigator.clipboard.writeText(value);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  }

  const webhookUrl = `${appUrl}/api/webhooks/whatsapp-cloud/${agentId}`;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap gap-2 p-3 border-b border-gray-800">
        <button
          onClick={() => setProvider("UAZAPI")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            provider === "UAZAPI" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          <QrCode size={15} /> QR code (não oficial)
        </button>
        <button
          onClick={() => setProvider("CLOUD_API")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            provider === "CLOUD_API" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-gray-200"
          }`}
        >
          <Globe2 size={15} /> API oficial (Meta)
        </button>
      </div>

      {provider === "UAZAPI" ? (
        <div className="p-4">
          <QrConnect agentId={agentId} />
        </div>
      ) : (
        <div className="p-6 space-y-6">
          <p className="text-xs text-gray-500">
            Use as credenciais da sua conta WhatsApp Business (Meta Business Manager): Phone Number ID, WABA ID e um Access Token.
          </p>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Phone Number ID</label>
              <input
                type="text"
                value={cfg.cloudApiPhoneNumberId}
                onChange={e => set("cloudApiPhoneNumberId", e.target.value)}
                placeholder="1234567890123456"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">WABA ID</label>
              <input
                type="text"
                value={cfg.cloudApiWabaId}
                onChange={e => set("cloudApiWabaId", e.target.value)}
                placeholder="1234567890123456"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Access Token</label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={cfg.cloudApiAccessToken}
                  onChange={e => set("cloudApiAccessToken", e.target.value)}
                  placeholder="EAAxxxxxxxxxxxxxxxx"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm pr-10 focus:outline-none focus:border-blue-600"
                />
                <button type="button" onClick={() => setShowToken(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              {saved ? <CheckCircle size={16} /> : <Save size={16} />}
              {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar credenciais"}
            </button>
            <button
              onClick={testConnection}
              disabled={testing || !cfg.cloudApiPhoneNumberId || !cfg.cloudApiAccessToken}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              <Wand2 size={16} />
              {testing ? "Testando..." : "Testar conexão"}
            </button>
          </div>

          {testResult && (
            <div className="bg-green-950/30 border border-green-800/40 rounded-xl p-4 flex items-center gap-2">
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">
                Conectado: <span className="font-semibold">{testResult.verifiedName}</span> ({testResult.displayPhoneNumber})
              </p>
            </div>
          )}

          <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-blue-300">Configure no Meta App Dashboard (WhatsApp → Configuration → Webhook)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-blue-300 text-[11px] truncate">{webhookUrl}</code>
              <button onClick={() => copy("url", webhookUrl)} className="text-gray-400 hover:text-gray-200 flex-shrink-0">
                {copied === "url" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
            {cfg.cloudApiVerifyToken ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-gray-900 px-2 py-1.5 rounded text-blue-300 text-[11px] truncate">{cfg.cloudApiVerifyToken}</code>
                <button onClick={() => copy("token", cfg.cloudApiVerifyToken)} className="text-gray-400 hover:text-gray-200 flex-shrink-0">
                  {copied === "token" ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-gray-500">Salve as credenciais uma vez para gerar o Verify Token do webhook.</p>
            )}
            <p className="text-[10px] text-gray-600">Cole a URL como "Callback URL" e o token como "Verify token". Inscreva o campo "messages".</p>
          </div>
        </div>
      )}
    </div>
  );
}
