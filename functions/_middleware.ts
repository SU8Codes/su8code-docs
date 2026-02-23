import {
  localeCookieName,
  parseCookie,
  pickLocale,
  supportedLocales,
} from "./_shared/locale";

type PagesContextLike = { request: Request; next(): Promise<Response> };

export const onRequest = async (context: PagesContextLike) => {
  const url = new URL(context.request.url);
  if (url.pathname !== "/") return await context.next();

  const cookies = parseCookie(context.request.headers.get("cookie"));
  const locale = pickLocale({
    cookieHeader: context.request.headers.get("cookie"),
    acceptLanguageHeader: context.request.headers.get("accept-language"),
    defaultLocale: "en",
  });
  if (!supportedLocales.includes(locale)) return await context.next();

  url.pathname = `/${locale}/`;
  // Cloudflare Workers: `Response.redirect()` returns a response with immutable headers,
  // so appending `Set-Cookie` would throw `Can't modify immutable headers.`
  const headers = new Headers({ Location: url.toString() });

  if (!cookies[localeCookieName]) {
    const cookieParts = [
      `${localeCookieName}=${encodeURIComponent(locale)}`,
      "Max-Age=31536000",
      "Path=/",
      "SameSite=Lax",
    ];
    if (url.protocol === "https:") cookieParts.push("Secure");
    headers.append("Set-Cookie", cookieParts.join("; "));
  }

  return new Response(null, { status: 302, headers });
};
