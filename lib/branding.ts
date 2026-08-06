import sharp from "sharp";
import { prisma } from "@/lib/prisma";

// Ícones maskable do Android recortam o PNG num círculo/squircle — conteúdo precisa caber
// numa "safe zone" central de ~80% do canvas (raio de segurança ~40% a partir do centro),
// senão as bordas do logo somem no recorte. O resto até a borda vira fundo sólido, nunca
// transparente (senão aparece um "buraco" na forma recortada).
const MASKABLE_SAFE_ZONE_RATIO = 0.8;
const BACKGROUND_COLOR = "#2A1D14"; // igual ao background_color do manifest

export type PwaIconVariants = {
  icon192: Buffer;
  icon512: Buffer;
  icon512Maskable: Buffer;
};

// Recebe o buffer de UMA imagem enviada pelo admin e gera os 3 variants do manifest.
export async function generatePwaIconVariants(sourceBuffer: Buffer): Promise<PwaIconVariants> {
  const source = sharp(sourceBuffer).rotate(); // rotate() sem args = auto-orienta via EXIF

  // "any": mantém a imagem inteira (contain), sem cortar — fundo transparente pro que sobrar
  const icon192 = await source
    .clone()
    .resize(192, 192, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const icon512 = await source
    .clone()
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  // "maskable": logo cabe na safe zone (410x410 dentro de 512x512), com fundo sólido
  // #030712 preenchendo o letterbox interno E toda a borda até 512x512 — sem transparência.
  const safeZoneSize = Math.round(512 * MASKABLE_SAFE_ZONE_RATIO); // 410
  const safeZoneContent = await source
    .clone()
    .resize(safeZoneSize, safeZoneSize, { fit: "contain", background: BACKGROUND_COLOR })
    .toBuffer();

  const icon512Maskable = await sharp({
    create: { width: 512, height: 512, channels: 4, background: BACKGROUND_COLOR },
  })
    .composite([{ input: safeZoneContent, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  return { icon192, icon512, icon512Maskable };
}

// Logo do menu lateral do CRM — sem redimensionamento, servida como veio (inclusive SVG).
export async function getMenuLogoDataUri(): Promise<string | null> {
  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: { menuLogoBase64: true, menuLogoMimeType: true },
  });
  if (!settings?.menuLogoBase64 || !settings.menuLogoMimeType) return null;
  return `data:${settings.menuLogoMimeType};base64,${settings.menuLogoBase64}`;
}
