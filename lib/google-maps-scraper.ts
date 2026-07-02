// Scraper de Google Maps para o agente de prospecção.
// AVISO: uso em desacordo com os Termos de Serviço do Google e com a LGPD —
// risco aceito explicitamente pelo usuário desta plataforma.
//
// Os seletores do Google Maps mudam com frequência. Quando quebrarem, atualize
// apenas este arquivo — o resto da integração permanece intacto.

import { chromium } from "playwright";

export type ScrapedBusiness = {
  nome: string;
  empresa: string;
  telefone: string;
  sourceUrl: string;
};

const TEL_REGEX = /(\(?\d{2}\)?\s?\d{4,5}[-\s]?\d{4})/;

export async function scrapeGoogleMaps(
  query: string,
  maxResults = 20
): Promise<ScrapedBusiness[]> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const results: ScrapedBusiness[] = [];

  try {
    const context = await browser.newContext({
      locale: "pt-BR",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2500);

    // Scrolla pra carregar mais resultados
    const feed = await page.$('[role="feed"]');
    if (feed) {
      for (let i = 0; i < Math.ceil(maxResults / 7); i++) {
        await feed.evaluate(el => el.scrollBy(0, 1500));
        await page.waitForTimeout(1200);
      }
    }

    // Coleta todos os cards visíveis
    const cards = await page.$$('.Nv2PK');
    for (const card of cards.slice(0, maxResults)) {
      try {
        const nome = await card.$eval(
          '.fontHeadlineSmall, .qBF1Pd, [class*="fontHeadline"]',
          (el: Element) => el?.textContent?.trim() ?? ""
        ).catch(() => "");
        if (!nome) continue;

        // Telefone na linha de info do card
        const infoLines = await card.$$eval(
          '[class*="W4Efsd"]',
          (els: Element[]) => els.map(e => e.textContent?.trim() ?? "")
        ).catch(() => [] as string[]);

        let telefone = "";
        for (const line of infoLines) {
          const match = line.match(TEL_REGEX);
          if (match) { telefone = match[0].replace(/[\s()]/g, ""); break; }
        }
        if (!telefone) continue;

        // Normaliza o telefone para formato numérico
        const telLimpo = telefone.replace(/\D/g, "");
        if (telLimpo.length < 8) continue;

        results.push({ nome, empresa: nome, telefone: telLimpo, sourceUrl: url });
      } catch {
        // card com erro — continua para o próximo
      }
    }
  } finally {
    await browser.close();
  }

  // Remove duplicatas por telefone
  const unique = [...new Map(results.map(r => [r.telefone, r])).values()];
  return unique;
}
