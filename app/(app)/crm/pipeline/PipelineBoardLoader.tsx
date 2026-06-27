"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { PipelineBoard as PipelineBoardType } from "./PipelineBoard";

// dnd-kit gera ids de acessibilidade (aria-describedby) que não batem entre servidor e
// cliente, causando hydration mismatch — esse board só faz sentido interativo no cliente.
const PipelineBoard = dynamic(() => import("./PipelineBoard").then(m => m.PipelineBoard), { ssr: false });

export function PipelineBoardLoader(props: ComponentProps<typeof PipelineBoardType>) {
  return <PipelineBoard {...props} />;
}
