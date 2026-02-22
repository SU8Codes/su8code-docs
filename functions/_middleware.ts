type Locale = "en" | "zh";

const supportedLocales: Locale[] = ["en", "zh"];
const cookieName = "su8_locale";

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
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (!first) return null;
  if (first.startsWith("zh")) return "zh";
  if (first.startsWith("en")) return "en";
  return null;
}

function toLocale(value: string | undefined): Locale | null {
  const v = String(value ?? "").trim().toLowerCase();
  if (v === "en" || v === "zh") return v;
  return null;
}

export const onRequest: PagesFunction = async (context) => {
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

