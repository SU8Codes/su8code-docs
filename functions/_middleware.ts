import { pickLocale, supportedLocales } from "./_shared/locale";

type PagesContextLike = { request: Request; next(): Promise<Response> };

export const onRequest = async (context: PagesContextLike) => {
  const url = new URL(context.request.url);
  if (url.pathname !== "/") return await context.next();

  const locale = pickLocale({
    cookieHeader: context.request.headers.get("cookie"),
    acceptLanguageHeader: context.request.headers.get("accept-language"),
    defaultLocale: "en",
  });
  if (!supportedLocales.includes(locale)) return await context.next();

  url.pathname = `/${locale}/`;
  return Response.redirect(url.toString(), 302);
};
