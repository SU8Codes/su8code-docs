import React, { useState } from 'react';

type ModelItem = {
  id?: string;
  name?: string;
};

function getApiBaseUrl() {
  return 'https://www.su8.codes/codex/v1';
}

function normalizeModels(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const anyPayload = payload as any;

  // OpenAI-ish: { data: [{ id: '...' }] }
  if (Array.isArray(anyPayload.data)) {
    return anyPayload.data
      .map((m: ModelItem) => m?.id || m?.name)
      .filter(Boolean);
  }

  // Some gateways: { models: ['...'] }
  if (Array.isArray(anyPayload.models)) {
    return anyPayload.models.filter((m: any) => typeof m === 'string');
  }

  return [];
}

export default function ModelsList() {
  const isZh = typeof window !== 'undefined' ? window.location.pathname.startsWith('/zh') : true;

  const t = {
    apiKeyPlaceholder: isZh ? '粘贴你的 API Key（不会被保存）' : 'Paste your API Key (will not be saved)',
    loadButtonLoading: isZh ? '加载中…' : 'Loading...',
    loadButton: isZh ? '加载模型' : 'Load Models',
    errorTitle: isZh ? '错误' : 'Error',
    copyBaseUrl: isZh ? '复制 Base URL' : 'Copy Base URL',
    copyBtn: isZh ? '复制' : 'Copy',
    errorParse: isZh 
      ? '接口返回成功了，但没有解析到模型列表。你可以把返回内容贴给我，我来适配格式。'
      : 'JSON parsed successfully but no models were detected. Please provide the response format.'
  };

  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setModels([]);
    try {
      const response = await fetch(`${getApiBaseUrl()}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`
        }
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(isZh ? `请求失败：HTTP ${response.status}\n\n${text}` : `Request failed: HTTP ${response.status}\n\n${text}`);
      }
      const json = await response.json();
      const list = normalizeModels(json);
      if (!list.length) {
        throw new Error(t.errorParse);
      }
      setModels(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="su8-card" style={{ padding: 18 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={t.apiKeyPlaceholder}
            type="password"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)'
            }}
          />
          <button
            onClick={load}
            disabled={!apiKey || loading}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'rgba(0,0,0,0.04)',
              cursor: !apiKey || loading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {loading ? t.loadButtonLoading : t.loadButton}
          </button>
        </div>

        {error ? (
          <div style={{ border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.06)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.errorTitle}</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</pre>
          </div>
        ) : null}

        {models.length ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => copy('https://www.su8.codes/codex/v1')}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(0,0,0,0.12)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                {t.copyBaseUrl}
              </button>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {models.map((m) => (
                <div
                  key={m}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.10)',
                    background: 'rgba(255,255,255,0.55)'
                  }}
                >
                  <code style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{m}</code>
                  <button
                    onClick={() => copy(m)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: 'transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {t.copyBtn}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
