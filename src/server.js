#!/usr/bin/env node
// Servidor MCP local para Google Forms.
// Ferramentas: criar e publicar formulário, ver formulário, adicionar pergunta,
// transformar em quiz, apagar pergunta, reordenar pergunta e ler respostas.
// As credenciais ficam em credentials/config.json (gerado por scripts/get-token.js).
// Problemas conhecidos e decisões de projeto: docs/revisao-de-codigo.md

import fs from "node:fs";
import { google } from "googleapis";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const CONFIG_PATH = new URL("../credentials/config.json", import.meta.url);
// A versão vem do package.json para não existirem duas fontes de verdade.
const pkg = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

// --- Autenticação -----------------------------------------------------------
// O cliente é criado uma única vez e reaproveitado entre as chamadas: o access
// token fica em cache na instância do OAuth2 e só é renovado quando expira.
let formsClient = null;

function getFormsClient() {
  if (formsClient) return formsClient;
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error("credentials/config.json não encontrado. Rode 'npm run token' na raiz do projeto para autorizar com o Google.");
  }
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    throw new Error("credentials/config.json inválido ou corrompido. Rode 'npm run token' para gerá-lo novamente.");
  }
  if (!cfg.refreshToken) {
    throw new Error("Falta o refreshToken em credentials/config.json. Rode 'npm run token' para gerá-lo.");
  }
  const oauth2 = new google.auth.OAuth2(cfg.clientId, cfg.clientSecret);
  oauth2.setCredentials({ refresh_token: cfg.refreshToken });
  formsClient = google.forms({ version: "v1", auth: oauth2 });
  return formsClient;
}

// --- Tradução de erros ------------------------------------------------------
// Erro de autenticação = refresh token inválido/revogado ou acesso negado (401).
function isAuthError(e) {
  const data = e?.response?.data;
  const raw = data?.error_description || data?.error?.message || e?.message || "";
  return (e?.response?.status ?? e?.code) === 401 || String(data?.error || raw).includes("invalid_grant");
}

// Converte erros da API do Google em mensagens acionáveis para quem usa a
// ferramenta, em vez de repassar stack traces e códigos crus.
function friendlyError(e) {
  const data = e?.response?.data;
  const raw = data?.error_description || data?.error?.message || e?.message || String(e);
  const status = e?.response?.status ?? e?.code;
  if (isAuthError(e)) {
    return "Credenciais expiradas ou revogadas pelo Google. Rode 'npm run token' para autorizar de novo.";
  }
  if (status === 403) return `Sem permissão para esta operação. Verifique se a API do Google Forms está ativada no projeto do Google Cloud e se o formulário pertence à sua conta. Detalhe: ${raw}`;
  if (status === 404) return "Formulário não encontrado — confira o formId.";
  if (status === 429) return "Limite de uso da API do Google atingido. Aguarde alguns instantes e tente novamente.";
  if (status === 400) return `O Google recusou a requisição: ${raw}`;
  return raw;
}

// --- Ajudantes --------------------------------------------------------------
const text = (s) => ({ content: [{ type: "text", text: s }] });
const fail = (s) => ({ ...text(s), isError: true });

async function fetchForm(formId) {
  const forms = getFormsClient();
  const res = await forms.forms.get({ formId });
  return res.data;
}

async function batchUpdate(formId, requests) {
  const forms = getFormsClient();
  await forms.forms.batchUpdate({ formId, requestBody: { requests } });
}

// Descreve um item do formulário para mensagens (as posições contam TODOS os
// itens — perguntas, blocos de texto, imagens, vídeos e quebras de seção).
function describeItem(item) {
  const title = item.title || "(sem título)";
  if (item.questionItem) return `pergunta "${title}"`;
  if (item.questionGroupItem) return `grade de perguntas "${title}"`;
  if (item.pageBreakItem) return `quebra de seção "${title}"`;
  if (item.textItem) return `bloco de texto "${title}"`;
  if (item.imageItem) return `imagem "${title}"`;
  if (item.videoItem) return `vídeo "${title}"`;
  return `item "${title}"`;
}

// Monta o objeto de pergunta conforme um "tipo" amigável, com nota opcional (quiz).
// Recebe a especificação completa (mesmos nomes dos parâmetros das ferramentas).
function buildQuestion(spec) {
  const { type, required, options, points, correctAnswers } = spec;
  const q = { required: !!required };
  switch (type) {
    case "short_text":
      q.textQuestion = { paragraph: false };
      break;
    case "paragraph":
      q.textQuestion = { paragraph: true };
      break;
    case "multiple_choice":
    case "checkboxes":
    case "dropdown": {
      const map = { multiple_choice: "RADIO", checkboxes: "CHECKBOX", dropdown: "DROP_DOWN" };
      if (!options || options.length === 0) {
        throw new Error(`O tipo '${type}' precisa de 'options' (lista de alternativas).`);
      }
      q.choiceQuestion = { type: map[type], options: options.map((v) => ({ value: v })) };
      break;
    }
    case "linear_scale": {
      const low = spec.scaleMin ?? 1;
      const high = spec.scaleMax ?? 5;
      if (low >= high) {
        throw new Error(`Escala inválida: scaleMin (${low}) precisa ser menor que scaleMax (${high}).`);
      }
      q.scaleQuestion = { low, high };
      if (spec.scaleMinLabel) q.scaleQuestion.lowLabel = spec.scaleMinLabel;
      if (spec.scaleMaxLabel) q.scaleQuestion.highLabel = spec.scaleMaxLabel;
      break;
    }
    case "date":
      // O ano entra por padrão (como na interface do Forms); a hora não.
      q.dateQuestion = { includeTime: !!spec.includeTime, includeYear: spec.includeYear ?? true };
      break;
    case "time":
      q.timeQuestion = { duration: !!spec.isDuration };
      break;
    case "rating":
      q.ratingQuestion = {
        ratingScaleLevel: spec.ratingLevels ?? 5,
        iconType: (spec.ratingIcon ?? "star").toUpperCase(),
      };
      break;
    default:
      throw new Error(`Tipo de pergunta desconhecido: '${type}'.`);
  }
  // Nota (quiz): só faz sentido com pontos definidos.
  if (typeof points === "number") {
    q.grading = { pointValue: points };
    if (correctAnswers && correctAnswers.length) {
      q.grading.correctAnswers = { answers: correctAnswers.map((v) => ({ value: v })) };
    }
  }
  return q;
}

// --- Servidor MCP -----------------------------------------------------------
const server = new McpServer({ name: "google-forms", version: pkg.version });

// Registra uma ferramenta com tratamento de erro uniforme: qualquer exceção
// vira uma mensagem amigável em vez de um erro cru para o cliente MCP.
// Em erro de autenticação, descarta o cliente memoizado e tenta UMA vez com o
// config atual — cobre o caso de 'npm run token' rodar com o servidor aberto.
function tool(name, def, handler) {
  server.registerTool(name, def, async (args) => {
    try {
      return await handler(args);
    } catch (e) {
      if (isAuthError(e)) {
        formsClient = null;
        try {
          return await handler(args);
        } catch (e2) {
          return fail(friendlyError(e2));
        }
      }
      return fail(friendlyError(e));
    }
  });
}

tool(
  "create_form",
  {
    title: "Criar formulário",
    description:
      "Cria um novo Google Form vazio e retorna o ID, o link de edição e o link de respostas. O formulário nasce NÃO publicado: use set_publish para liberar respostas.",
    inputSchema: {
      title: z.string().describe("Título do formulário, visível para quem responde"),
      documentTitle: z.string().optional().describe("Nome do arquivo no Drive (opcional)"),
    },
  },
  async ({ title, documentTitle }) => {
    const forms = getFormsClient();
    const res = await forms.forms.create({
      requestBody: { info: { title, documentTitle: documentTitle || title } },
    });
    const f = res.data;
    return text([
      `Formulário criado (ainda não publicado — use set_publish para aceitar respostas).`,
      `formId: ${f.formId}`,
      `Editar: https://docs.google.com/forms/d/${f.formId}/edit`,
      `Responder: ${f.responderUri || "(disponível após publicar)"}`,
    ].join("\n"));
  }
);

tool(
  "set_publish",
  {
    title: "Publicar formulário",
    description:
      "Publica ou despublica um formulário. Formulários criados via API nascem despublicados e não aceitam respostas até serem publicados.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      published: z.boolean().describe("true para publicar (visível e aceitando respostas), false para despublicar"),
    },
  },
  async ({ formId, published }) => {
    const forms = getFormsClient();
    await forms.forms.setPublishSettings({
      formId,
      requestBody: {
        publishSettings: { publishState: { isPublished: published, isAcceptingResponses: published } },
        updateMask: "publish_state",
      },
    });
    return text(
      published
        ? `Formulário ${formId} publicado e aceitando respostas.`
        : `Formulário ${formId} despublicado (não aceita mais respostas).`
    );
  }
);

tool(
  "get_form",
  {
    title: "Ver formulário",
    description:
      "Retorna a estrutura de um formulário: a lista de itens com as posições (use-as em add_question, delete_question e move_question) e o JSON completo.",
    inputSchema: { formId: z.string().describe("ID do formulário") },
  },
  async ({ formId }) => {
    const form = await fetchForm(formId);
    const items = (form.items || []).map((it, i) => `${i}: ${describeItem(it)}`);
    return text(
      `Itens (posição: tipo):\n${items.join("\n") || "(formulário vazio)"}\n\nJSON completo:\n${JSON.stringify(form, null, 2)}`
    );
  }
);

// Campos que descrevem UMA pergunta — compartilhados por add_question (e, no
// futuro, por outras ferramentas que criem perguntas).
const questionFields = {
  title: z.string().describe("Enunciado da pergunta"),
  type: z
    .enum([
      "short_text",
      "paragraph",
      "multiple_choice",
      "checkboxes",
      "dropdown",
      "linear_scale",
      "date",
      "time",
      "rating",
    ])
    .describe("Tipo da pergunta"),
  required: z.boolean().optional().describe("Se a resposta é obrigatória"),
  options: z.array(z.string()).optional().describe("Alternativas (para multiple_choice/checkboxes/dropdown)"),
  points: z.number().optional().describe("Pontos da pergunta no quiz (exige modo quiz ativo; ex.: 1)"),
  correctAnswers: z
    .array(z.string())
    .optional()
    .describe("Resposta(s) correta(s) para quiz, batendo com as 'options'"),
  scaleMin: z.number().int().min(0).max(1).optional().describe("(linear_scale) Início da escala: 0 ou 1 (padrão 1)"),
  scaleMax: z.number().int().min(2).max(10).optional().describe("(linear_scale) Fim da escala: 2 a 10 (padrão 5)"),
  scaleMinLabel: z.string().optional().describe("(linear_scale) Rótulo do início, ex.: 'Discordo totalmente'"),
  scaleMaxLabel: z.string().optional().describe("(linear_scale) Rótulo do fim, ex.: 'Concordo totalmente'"),
  includeTime: z.boolean().optional().describe("(date) Pedir também a hora (padrão: não)"),
  includeYear: z.boolean().optional().describe("(date) Pedir o ano (padrão: sim)"),
  isDuration: z.boolean().optional().describe("(time) true = duração (horas e minutos); false = hora do dia (padrão)"),
  ratingLevels: z.number().int().min(3).max(10).optional().describe("(rating) Quantidade de níveis: 3 a 10 (padrão 5)"),
  ratingIcon: z.enum(["star", "heart", "thumb_up"]).optional().describe("(rating) Ícone da avaliação (padrão star)"),
};

tool(
  "add_question",
  {
    title: "Adicionar pergunta",
    description:
      "Acrescenta uma pergunta a um formulário (no final, ou na posição indicada por 'index'). " +
      "Tipos: texto curto/longo, escolha (única, múltipla, lista), escala linear, data, hora e avaliação. " +
      "Para valer pontos ('points'), o formulário precisa estar em modo quiz — use set_quiz antes.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      ...questionFields,
      index: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Posição do novo item (0 = primeiro; as posições contam todos os itens). Se omitido, entra no final."),
    },
  },
  async (args) => {
    const { formId, title, points, index } = args;
    // O forms.get abaixo faz papel triplo: calcula a posição de inserção,
    // valida o índice pedido e checa o modo quiz antes de anexar pontuação.
    const form = await fetchForm(formId);
    const items = form.items || [];
    if (typeof points === "number" && !form.settings?.quizSettings?.isQuiz) {
      return fail(
        "Este formulário não está em modo quiz, e 'points' só funciona em quizzes. " +
          "Rode set_quiz com isQuiz=true antes, ou repita sem 'points'."
      );
    }
    const at = index ?? items.length;
    if (at > items.length) {
      return fail(`Posição ${at} fora do intervalo: o formulário tem ${items.length} item(ns), então use 0 a ${items.length}.`);
    }
    const question = buildQuestion(args);
    await batchUpdate(formId, [
      { createItem: { item: { title, questionItem: { question } }, location: { index: at } } },
    ]);
    return text(`Pergunta "${title}" adicionada na posição ${at} (contando todos os itens do formulário).`);
  }
);

tool(
  "set_quiz",
  {
    title: "Modo quiz",
    description: "Liga ou desliga o modo quiz (com notas) de um formulário.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      isQuiz: z.boolean().describe("true para virar quiz, false para voltar a formulário comum"),
    },
  },
  async ({ formId, isQuiz }) => {
    await batchUpdate(formId, [
      { updateSettings: { settings: { quizSettings: { isQuiz } }, updateMask: "quizSettings.isQuiz" } },
    ]);
    return text(`Modo quiz ${isQuiz ? "ativado" : "desativado"} no formulário ${formId}.`);
  }
);

tool(
  "delete_question",
  {
    title: "Apagar pergunta",
    description:
      "Remove a pergunta na posição indicada. As posições contam TODOS os itens (0 = primeiro) — confira antes com get_form. Recusa apagar itens que não sejam perguntas.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      index: z.number().int().min(0).describe("Posição do item (começa em 0; veja as posições com get_form)"),
    },
  },
  async ({ formId, index }) => {
    const form = await fetchForm(formId);
    const items = form.items || [];
    if (index >= items.length) {
      return fail(`Posição ${index} não existe: o formulário tem ${items.length} item(ns)${items.length ? ` (0 a ${items.length - 1})` : ""}.`);
    }
    const item = items[index];
    if (!item.questionItem && !item.questionGroupItem) {
      return fail(
        `O item na posição ${index} não é uma pergunta, é uma ${describeItem(item)}. ` +
          `Nada foi apagado — confira as posições com get_form.`
      );
    }
    await batchUpdate(formId, [{ deleteItem: { location: { index } } }]);
    return text(`Removida a ${describeItem(item)} (posição ${index}) do formulário ${formId}.`);
  }
);

tool(
  "move_question",
  {
    title: "Reordenar pergunta",
    description:
      "Move um item de uma posição para outra. As posições contam TODOS os itens (0 = primeiro) — confira antes com get_form.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      from: z.number().int().min(0).describe("Posição atual do item"),
      to: z.number().int().min(0).describe("Nova posição desejada"),
    },
  },
  async ({ formId, from, to }) => {
    if (from === to) {
      return text(`As posições de origem e destino são iguais (${from}) — nada a fazer.`);
    }
    const form = await fetchForm(formId);
    const items = form.items || [];
    const max = items.length - 1;
    if (from > max || to > max) {
      return fail(`Posição fora do intervalo: o formulário tem ${items.length} item(ns)${items.length ? ` (0 a ${max})` : ""}.`);
    }
    await batchUpdate(formId, [
      { moveItem: { originalLocation: { index: from }, newLocation: { index: to } } },
    ]);
    return text(`${describeItem(items[from])} movida da posição ${from} para ${to} no formulário ${formId}.`);
  }
);

// Converte uma resposta individual em texto legível, cobrindo também
// perguntas de upload de arquivo (criadas pela interface do Forms).
function renderAnswer(a) {
  if (a.textAnswers?.answers?.length) {
    return a.textAnswers.answers.map((x) => x.value).join(", ");
  }
  if (a.fileUploadAnswers?.answers?.length) {
    return a.fileUploadAnswers.answers
      .map((x) => `arquivo enviado: ${x.fileName || x.fileId}`)
      .join(", ");
  }
  return "(resposta em formato não textual)";
}

tool(
  "list_responses",
  {
    title: "Ler respostas",
    description: "Lista as respostas de um formulário, já com o enunciado de cada pergunta no lugar do código interno.",
    inputSchema: { formId: z.string().describe("ID do formulário") },
  },
  async ({ formId }) => {
    const forms = getFormsClient();
    // As duas buscas são independentes; rodam em paralelo.
    const [formRes, listRes] = await Promise.all([
      forms.forms.get({ formId }),
      forms.forms.responses.list({ formId }),
    ]);
    // Mapa questionId -> enunciado, para deixar a saída legível.
    const titleById = {};
    for (const item of formRes.data.items || []) {
      const qid = item.questionItem?.question?.questionId;
      if (qid) titleById[qid] = item.title || "(sem título)";
    }
    const responses = listRes.data.responses || [];
    if (responses.length === 0) {
      return text("Nenhuma resposta ainda. (O formulário está publicado? Veja set_publish.)");
    }
    const blocks = responses.map((r, i) => {
      const lines = [`Resposta ${i + 1} (${r.lastSubmittedTime || "?"}):`];
      for (const [qid, a] of Object.entries(r.answers || {})) {
        const label = titleById[qid] || qid;
        lines.push(`  - ${label}: ${renderAnswer(a)}`);
      }
      if (typeof r.totalScore === "number") lines.push(`  Nota: ${r.totalScore}`);
      return lines.join("\n");
    });
    return text(`${responses.length} resposta(s):\n\n` + blocks.join("\n\n"));
  }
);

// --- Conexão (entrada/saída padrão) -----------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
