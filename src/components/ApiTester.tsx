import React, { useMemo, useState } from 'react';

type Endpoint = 'responses' | 'chat_completions';

function getApiBaseUrl() {
  return 'https://www.su8.codes/codex/v1';
}

function buildCurl(params: {
  apiKey: string;
  endpoint: Endpoint;
  model: string;
  message: string;
  stream: boolean;
}) {
  const url =
    params.endpoint === 'responses'
      ? 'https://www.su8.codes/codex/v1/responses'
      : 'https://www.su8.codes/codex/v1/chat/completions';
  const headers = [
    "-H 'Content-Type: application/json'",
    `-H 'Authorization: Bearer ${params.apiKey || '<YOUR_API_KEY>'}'`
  ].join(' \\\n  ');

  const body =
    params.endpoint === 'responses'
      ? {
          model: params.model,
          input: [
            {
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text: params.message }]
            }
          ],
          stream: params.stream
        }
      : {
          model: params.model,
          messages: [{ role: 'user', content: params.message }],
          stream: params.stream
        };

  return `curl '${url}' \\\n  ${headers} \\\n  -d '${JSON.stringify(body, null, 2)}'`;
}

async function readStreamText(response: Response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

export default function ApiTester() {
  const isZh = typeof window !== 'undefined' ? window.location.pathname.startsWith('/zh') : true;

  const codeBoxStyle: React.CSSProperties = {
    margin: 0,
    padding: 12,
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    wordBreak: 'break-word'
  };

  const t = {
    apiKeyLabel: isZh ? 'API Key' : 'API Key',
    apiKeyPlaceholder: isZh ? '粘贴你的 API Key（不会被保存）' : 'Paste your API Key (will not be saved)',
    endpointLabel: isZh ? '接口' : 'Endpoint',
    endpointResponses: isZh ? '/responses（推荐）' : '/responses (Recommended)',
    endpointChat: isZh ? '/chat/completions（兼容）' : '/chat/completions (Compatible)',
    modelLabel: isZh ? '模型' : 'Model',
    modelPlaceholder: isZh ? '比如：gpt-5.2' : 'e.g., gpt-5.2',
    messageLabel: isZh ? '消息' : 'Message',
    messageDefault: isZh ? '你好' : 'Hello',
    streamLabel: isZh ? '流式（stream）' : 'Stream',
    sendButtonSending: isZh ? '请求中…' : 'Sending...',
    sendButton: isZh ? '发送测试请求' : 'Send Test Request',
    copyCurl: isZh ? '复制 curl' : 'Copy curl',
    curlPreview: isZh ? 'curl 预览' : 'curl Preview',
    errorTitle: isZh ? '错误' : 'Error',
    resultTitle: isZh ? '结果' : 'Result',
    errorAuth: isZh ? '（看起来像是 API Key 不对，或者没有权限）' : '(Invalid API Key or unauthorized)',
    errorRateLimit: isZh ? '（看起来被限流了，稍等再试）' : '(Rate limited, please try again later)',
    errorServer: isZh ? '（看起来服务端临时出问题了，稍后再试）' : '(Server error, please try again later)',
    emptyResponse: isZh ? '(空响应)' : '(Empty Response)'
  };

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState<Endpoint>('responses');
  const [model, setModel] = useState('gpt-5.2');
  const [message, setMessage] = useState(t.messageDefault);
  const [stream, setStream] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);

  const curl = useMemo(() => buildCurl({ apiKey, endpoint, model, message, stream }), [apiKey, endpoint, model, message, stream]);

  async function copyText(text: string) {
    await navigator.clipboard.writeText(text);
  }

  async function send() {
    setLoading(true);
    setError(null);
    setResult('');
    try {
      const url =
        endpoint === 'responses' ? `${apiBaseUrl}/responses` : `${apiBaseUrl}/chat/completions`;

      const body =
        endpoint === 'responses'
          ? {
              model,
              input: [
                {
                  type: 'message',
                  role: 'user',
                  content: [{ type: 'input_text', text: message }]
                }
              ],
              stream
            }
          : {
              model,
              messages: [{ role: 'user', content: message }],
              stream
            };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        const hint =
          response.status === 401
            ? t.errorAuth
            : response.status === 429
              ? t.errorRateLimit
              : response.status >= 500
                ? t.errorServer
                : '';
        throw new Error(isZh ? `请求失败：HTTP ${response.status} ${hint}\n\n${text}` : `Request failed: HTTP ${response.status} ${hint}\n\n${text}`);
      }

      if (stream) {
        const text = await readStreamText(response);
        setResult(text || t.emptyResponse);
      } else {
        const json = await response.json();
        setResult(JSON.stringify(json, null, 2));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="su8-card" style={{ padding: 18 }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{t.apiKeyLabel}</div>
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
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{t.endpointLabel}</div>
            <select
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value as Endpoint)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)'
              }}
            >
              <option value="responses">{t.endpointResponses}</option>
              <option value="chat_completions">{t.endpointChat}</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{t.modelLabel}</div>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t.modelPlaceholder}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.12)'
              }}
            />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{t.messageLabel}</div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)'
            }}
          />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input checked={stream} onChange={(e) => setStream(e.target.checked)} type="checkbox" />
          <span>{t.streamLabel}</span>
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={send}
            disabled={!apiKey || loading}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: 'none',
              background: (!apiKey || loading) ? 'rgba(0,0,0,0.1)' : '#305adf',
              color: (!apiKey || loading) ? 'rgba(0,0,0,0.4)' : '#ffffff',
              fontWeight: 600,
              cursor: !apiKey || loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? t.sendButtonSending : t.sendButton}
          </button>
          <button
            onClick={() => copyText(curl)}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.15)',
              background: 'rgba(255,255,255,0.8)',
              color: '#333',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.copyCurl}
          </button>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{t.curlPreview}</div>
          <pre style={codeBoxStyle}><code style={{ display: 'block' }}>{curl}</code></pre>
        </div>

        {error ? (
          <div style={{ minWidth: 0, border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.06)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.errorTitle}</div>
            <pre style={codeBoxStyle}>{error}</pre>
          </div>
        ) : null}

        {result ? (
          <div style={{ minWidth: 0, border: '1px solid rgba(34,197,94,0.22)', background: 'rgba(34,197,94,0.06)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{t.resultTitle}</div>
            <pre style={codeBoxStyle}>{result}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
