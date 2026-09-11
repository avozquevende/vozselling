import { getDb } from "./db";
import { gerarTexto } from "./llm";
import { avancarPasso, definicaoEscada, type ItemRetomada } from "./retomada";
import { enviarParaLead } from "./instagram-sync";
import { buscarSecao } from "./metodologia";

const SISTEMA_BASE = `Você escreve mensagens curtas de retomada no Instagram Direct, como se fosse a pessoa dona do perfil.
Um toque por vez, nunca cobra resposta, nunca soa como script de vendas. Siga a orientação da escada abaixo.`;

function montarSistema(): string {
  const tomDeVoz = buscarSecao("tom_de_voz");
  return tomDeVoz ? `${SISTEMA_BASE}\n\n${tomDeVoz}` : SISTEMA_BASE;
}

interface HistoricoItem {
  remetente: "lead" | "robo" | "operador";
  texto: string;
}

function buscarHistorico(leadId: number): HistoricoItem[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT remetente, texto FROM mensagens WHERE lead_id = ? ORDER BY criado_em DESC LIMIT 6",
    )
    .all(leadId) as HistoricoItem[];
}

function montarPrompt(escada: string, comoFala: string, historico: HistoricoItem[]): string {
  const conversa = historico
    .slice()
    .reverse()
    .map((m) => `${m.remetente === "lead" ? "Lead" : "Você"}: ${m.texto}`)
    .join("\n");

  const doMetodo = buscarSecao(`retomada_${escada}`);
  const orientacao = doMetodo ? `${comoFala}\n\n${doMetodo}` : comoFala;

  return `Orientação desta escada: ${orientacao}\n\nÚltimas mensagens da conversa:\n${conversa || "(sem histórico ainda)"}\n\nEscreva o toque de retomada, só o texto dele.`;
}

function registrarToque(leadId: number, texto: string): void {
  const db = getDb();
  db.prepare("INSERT INTO mensagens (lead_id, remetente, texto) VALUES (?, 'robo', ?)").run(
    leadId,
    texto,
  );
}

export interface ResultadoToqueRetomada {
  leadId: number;
  escada: string;
  texto: string;
  virouNutricao: boolean;
}

export async function processarToqueDeRetomada(
  item: ItemRetomada,
  workspaceId: number,
): Promise<ResultadoToqueRetomada> {
  const definicao = definicaoEscada(item.escada);
  const historico = buscarHistorico(item.lead_id);

  const texto = await gerarTexto({
    modelo: process.env.A3_MODEL ?? "gpt-4o-mini",
    sistema: montarSistema(),
    prompt: montarPrompt(item.escada, definicao.comoFala, historico),
    temperatura: 0.8,
  });

  await enviarParaLead(workspaceId, item.instagram_scoped_id, texto);
  registrarToque(item.lead_id, texto);
  const virouNutricao = item.passo >= 7;
  avancarPasso(item, workspaceId);

  return { leadId: item.lead_id, escada: item.escada, texto, virouNutricao };
}
