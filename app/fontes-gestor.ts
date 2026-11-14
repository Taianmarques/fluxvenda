import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";

// Fontes da landing "Gestor com IA" (identidade preto, branco e dourado, sem serifa):
// títulos em Manrope ExtraBold, texto em Inter e etiquetas técnicas em IBM Plex Mono.
// Arquivo separado de fontes.ts para as outras landings não carregarem essas fontes.

const titulo = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--g-titulo", display: "swap" });
const texto = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--g-texto", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--g-mono", display: "swap" });

export const fontesGestor = `${titulo.variable} ${texto.variable} ${mono.variable}`;
