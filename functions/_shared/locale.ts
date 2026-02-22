export type Locale = "en" | "zh";

export const supportedLocales: Locale[] = ["en", "zh"];
export const localeCookieName = "su8_locale";

export function parseCookie(header: string | null | undefined): Record<string, string> {
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

export function toLocale(value: string | undefined): Locale | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "en" || v === "zh") return v;
  return null;
}

export function pickFromAcceptLanguage(header: string | null | undefined): Locale | null {
  const raw = String(header ?? "").trim();
  if (!raw) return null;

  // Example: "zh-CN,zh;q=0.9,en;q=0.8"
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

  ranges.sort((a, b) => (b.q !== a.q ? b.q - a.q : a.index - b.index));

  for (const { lang } of ranges) {
    if (lang === "*") continue;
    if (lang.startsWith("zh")) return "zh";
    if (lang.startsWith("en")) return "en";
  }

  return null;
}

export function pickLocale(params: {
  cookieHeader?: string | null;
  acceptLanguageHeader?: string | null;
  cookieName?: string;
  defaultLocale?: Locale;
}): Locale {
  const cookieName = params.cookieName ?? localeCookieName;
  const cookies = parseCookie(params.cookieHeader);
  const fromCookie = toLocale(cookies[cookieName]);
  if (fromCookie) return fromCookie;

  const fromHeader = pickFromAcceptLanguage(params.acceptLanguageHeader);
  return fromHeader ?? (params.defaultLocale ?? "en");
}

