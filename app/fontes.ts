import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";

// Fontes da identidade Vendas IA (landings e área logada): texto em Inter Tight, destaque dos
// títulos em itálico serifado (Instrument Serif) e rótulos em mono (JetBrains Mono).
// fontesVendasIA = classes que expõem --f-ui, --f-serif e --f-mono no elemento.

const ui = Inter_Tight({ subsets: ["latin"], variable: "--f-ui", display: "swap" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono", display: "swap" });

export const fontesVendasIA = `${ui.variable} ${serif.variable} ${mono.variable}`;
