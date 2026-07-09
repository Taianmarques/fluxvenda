import { prisma } from "../lib/prisma";

async function main() {
  const agents = await prisma.agentConfig.findMany({ select: { id: true, nome: true, active: true }, take: 5 });
  console.log(JSON.stringify(agents, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
