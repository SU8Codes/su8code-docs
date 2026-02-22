type Locale = "en" | "zh";

const supportedLocales: Locale[] = ["en", "zh"];
const cookieName = "su8_locale";

type PagesContextLike = {
  request: Request;
  next(): Promise<Response>;
};

function parseCookie(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    out[key] = value;
  }
  return out;
}

function pickFromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;

  // Example: "zh-CN,zh;q=0.9,en;q=0.8"
  const raw = header.trim();
  if (!raw) return null;

  type Range = { lang: string; q: number; index: number };
  const ranges: Range[] = [];

  raw.split(",").forEach((part, index) => {
    const segments = part.split(";");
    const lang = segments[0]?.trim().toLowerCase();
    if (!lang) return;

    let q = 1;
    for (let i = 1; i < segments.length; i++) {
      const param = segments[i]?.trim().toLowerCase();
      if (!param?.startsWith("q=")) continue;
      const parsed = Number.parseFloat(param.slice(2));
      if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) q = parsed;
      break;
    }

    ranges.push({ lang, q, index });
  });

  if (!ranges.length) return null;

  ranges.sort((a, b) => (b.q !== a.q ? b.q - a.q : a.index - b.index));

  for (const { lang } of ranges) {
    if (lang === "*") continue;
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }

  return null;
}

function toLocale(value: string | undefined): Locale | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "en" || v === "zh") return v;
  return null;
}

export const onRequest = async (context: PagesContextLike) => {
  const url = new URL(context.request.url);
  if (url.pathname !== "/") return await context.next();

  const cookies = parseCookie(context.request.headers.get("cookie"));
  const fromCookie = toLocale(cookies[cookieName]);
  const fromHeader = pickFromAcceptLanguage(context.request.headers.get("accept-language"));
  const locale = fromCookie ?? fromHeader ?? "en";
  if (!supportedLocales.includes(locale)) return await context.next();

  url.pathname = `/${locale}/`;
  return Response.redirect(url.toString(), 302);
};
