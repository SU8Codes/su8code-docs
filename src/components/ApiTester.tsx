import React, { useMemo, useState } from 'react';

type Endpoint = 'responses' | 'chat_completions';

function getApiBaseUrl() {
  // 本地开发：用 Vite proxy（同源，避免 CORS）
  // 线上部署到 docs.su8.codes：直接请求 su8.codes（跨域，需要 API 放行 CORS）
  if (typeof window === 'undefined') return 'https://www.su8.codes/codex/v1';
  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  if (isLocal) return '/codex/v1';
  if (host === 'su8.codes' || host === 'www.su8.codes') return '/codex/v1';
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
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState<Endpoint>('responses');
  const [model, setModel] = useState('gpt-5.2');
  const [message, setMessage] = useState('你好');
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
            ? '（看起来像是 API Key 不对，或者没有权限）'
            : response.status === 429
              ? '（看起来被限流了，稍等再试）'
              : response.status >= 500
                ? '（看起来服务端临时出问题了，稍后再试）'
                : '';
        throw new Error(`请求失败：HTTP ${response.status} ${hint}\n\n${text}`);
      }

      if (stream) {
        const text = await readStreamText(response);
        setResult(text || '(空响应)');
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
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>API Key</div>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="粘贴你的 API Key（不会被保存）"
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
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>接口</div>
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
              <option value="responses">/responses（推荐）</option>
              <option value="chat_completions">/chat/completions（兼容）</option>
            </select>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>模型</div>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="比如：gpt-5.2"
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
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>消息</div>
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
          <span>流式（stream）</span>
        </label>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={send}
            disabled={!apiKey || loading}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.14)',
              background: 'rgba(0,0,0,0.04)',
              cursor: !apiKey || loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? '请求中…' : '发送测试请求'}
          </button>
          <button
            onClick={() => copyText(curl)}
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            复制 curl
          </button>
        </div>

        <div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>curl 预览</div>
          <pre style={{ margin: 0, padding: 12, overflowX: 'auto' }}>
            <code>{curl}</code>
          </pre>
        </div>

        {error ? (
          <div style={{ border: '1px solid rgba(220,38,38,0.25)', background: 'rgba(220,38,38,0.06)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>错误</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{error}</pre>
          </div>
        ) : null}

        {result ? (
          <div style={{ border: '1px solid rgba(34,197,94,0.22)', background: 'rgba(34,197,94,0.06)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>结果</div>
            <pre style={{ margin: 0, overflowX: 'auto' }}>{result}</pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
