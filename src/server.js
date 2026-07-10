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

// Frase sobre o estado de publicação de um formulário recém-criado, a partir
// do que a API respondeu — em vez de assumir um padrão fixo (o padrão do
// Google já mudou ao longo do tempo; ver docs/estudo-de-mcps-similares.md).
function publishStateLine(form) {
  const state = form.publishSettings?.publishState;
  if (!state) return "estado de publicação não informado pela API — confira com get_form";
  return state.isPublished
    ? "já publicado e aceitando respostas"
    : "não publicado — use set_publish para liberar respostas";
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

// Nome amigável do tipo de uma pergunta (o objeto question da API).
function questionKind(q) {
  if (q.textQuestion) return q.textQuestion.paragraph ? "texto longo" : "texto curto";
  if (q.choiceQuestion) {
    const map = { RADIO: "múltipla escolha", CHECKBOX: "caixas de seleção", DROP_DOWN: "lista suspensa" };
    return map[q.choiceQuestion.type] || "escolha";
  }
  if (q.scaleQuestion) return `escala ${q.scaleQuestion.low}–${q.scaleQuestion.high}`;
  if (q.dateQuestion) return q.dateQuestion.includeTime ? "data e hora" : "data";
  if (q.timeQuestion) return q.timeQuestion.duration ? "duração" : "hora";
  if (q.ratingQuestion) return `avaliação (${q.ratingQuestion.ratingScaleLevel} níveis)`;
  if (q.fileUploadQuestion) return "upload de arquivo";
  return "tipo desconhecido";
}

// Linha detalhada de um item para o get_form: tipo, obrigatoriedade,
// alternativas, rótulos de escala e pontuação/gabarito (quiz).
function describeItemDetail(item) {
  const q = item.questionItem?.question;
  if (!q) return describeItem(item);
  const attrs = [questionKind(q)];
  if (q.required) attrs.push("obrigatória");
  const extra = [];
  if (q.choiceQuestion?.options) {
    extra.push(`opções: ${q.choiceQuestion.options.map((o) => o.value ?? (o.isOther ? "(Outro)" : "?")).join(" | ")}`);
  }
  if (q.scaleQuestion?.lowLabel || q.scaleQuestion?.highLabel) {
    extra.push(`rótulos: "${q.scaleQuestion.lowLabel || ""}" → "${q.scaleQuestion.highLabel || ""}"`);
  }
  if (q.grading) {
    let g = `vale ${q.grading.pointValue ?? 0} ponto(s)`;
    const ca = q.grading.correctAnswers?.answers?.map((a) => a.value);
    if (ca?.length) g += `; correta(s): ${ca.join(" | ")}`;
    extra.push(g);
  }
  return `pergunta "${item.title || "(sem título)"}" — ${attrs.join(", ")}${extra.length ? `; ${extra.join("; ")}` : ""}`;
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
      "Cria um novo Google Form vazio e retorna o ID, o link de edição e o link de respostas. " +
      "Por padrão o Google cria o formulário JÁ PUBLICADO; use unpublished=true para criá-lo como rascunho. " +
      "A resposta informa o estado real de publicação.",
    inputSchema: {
      title: z.string().describe("Título do formulário, visível para quem responde"),
      documentTitle: z.string().optional().describe("Nome do arquivo no Drive (opcional)"),
      unpublished: z
        .boolean()
        .optional()
        .describe("true para criar como rascunho (ninguém responde até set_publish). Padrão: publicado."),
    },
  },
  async ({ title, documentTitle, unpublished }) => {
    const forms = getFormsClient();
    const res = await forms.forms.create({
      ...(unpublished ? { unpublished: true } : {}),
      requestBody: { info: { title, documentTitle: documentTitle || title } },
    });
    const f = res.data;
    return text([
      `Formulário criado (${publishStateLine(f)}).`,
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
  "update_form_info",
  {
    title: "Editar título/descrição do formulário",
    description:
      "Altera o título e/ou a descrição de um formulário existente (o que aparece no topo para quem responde). " +
      "O nome do arquivo no Drive (documentTitle) não pode ser alterado pela API depois da criação.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      title: z.string().optional().describe("Novo título"),
      description: z.string().optional().describe("Nova descrição"),
    },
  },
  async ({ formId, title, description }) => {
    const info = {};
    const masks = [];
    if (title !== undefined) {
      info.title = title;
      masks.push("title");
    }
    if (description !== undefined) {
      info.description = description;
      masks.push("description");
    }
    if (!masks.length) return fail("Nada a alterar — informe 'title' e/ou 'description'.");
    await batchUpdate(formId, [{ updateFormInfo: { info, updateMask: masks.join(",") } }]);
    return text(
      `Formulário ${formId} atualizado: ${masks.map((m) => (m === "title" ? "título" : "descrição")).join(" e ")}.`
    );
  }
);

tool(
  "get_form",
  {
    title: "Ver formulário",
    description:
      "Mostra a estrutura de um formulário: dados gerais e a lista de itens com as posições " +
      "(use-as em add_question, delete_question e move_question). Com raw=true, inclui também o JSON completo da API.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      raw: z
        .boolean()
        .optional()
        .describe("true para incluir também o JSON completo da API (saída bem maior; só quando o resumo não bastar)"),
    },
  },
  async ({ formId, raw }) => {
    const form = await fetchForm(formId);
    const items = form.items || [];
    const head = [`Formulário "${form.info?.title || "(sem título)"}" — formId: ${form.formId}`];
    if (form.info?.description) head.push(`Descrição: ${form.info.description}`);
    head.push(`Modo quiz: ${form.settings?.quizSettings?.isQuiz ? "sim" : "não"}`);
    const pub = form.publishSettings?.publishState;
    if (pub) {
      head.push(`Publicado: ${pub.isPublished ? `sim (aceitando respostas: ${pub.isAcceptingResponses ? "sim" : "não"})` : "não"}`);
    }
    if (form.responderUri) head.push(`Responder: ${form.responderUri}`);
    const lines = items.map((it, i) => `${i}: ${describeItemDetail(it)}`);
    let out = `${head.join("\n")}\n\nItens (posição: descrição):\n${lines.join("\n") || "(formulário vazio)"}`;
    if (raw) out += `\n\nJSON completo:\n${JSON.stringify(form, null, 2)}`;
    return text(out);
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
  "update_question",
  {
    title: "Editar pergunta",
    description:
      "Altera uma pergunta existente na posição indicada: enunciado, obrigatoriedade, alternativas, pontos e gabarito — " +
      "sem apagar e recriar, preservando o vínculo com respostas já recebidas. Confira a posição com get_form.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      index: z.number().int().min(0).describe("Posição do item (começa em 0; veja as posições com get_form)"),
      title: z.string().optional().describe("Novo enunciado"),
      required: z.boolean().optional().describe("true = resposta obrigatória; false = opcional"),
      options: z
        .array(z.string())
        .min(1)
        .optional()
        .describe("Novas alternativas — substituem TODAS as atuais (só para perguntas de escolha)"),
      points: z.number().optional().describe("Nova pontuação (exige modo quiz)"),
      correctAnswers: z
        .array(z.string())
        .optional()
        .describe("Novo gabarito, batendo com as alternativas (exige modo quiz)"),
    },
  },
  async ({ formId, index, title, required, options, points, correctAnswers }) => {
    const form = await fetchForm(formId);
    const items = form.items || [];
    if (index >= items.length) {
      return fail(`Posição ${index} não existe: o formulário tem ${items.length} item(ns)${items.length ? ` (0 a ${items.length - 1})` : ""}.`);
    }
    const existing = items[index];
    if (!existing.questionItem) {
      return fail(
        `O item na posição ${index} não é uma pergunta editável, é uma ${describeItem(existing)}. Nada foi alterado.`
      );
    }
    const item = {};
    const masks = [];
    const changes = [];
    if (title !== undefined) {
      item.title = title;
      masks.push("title");
      changes.push("enunciado");
    }
    const q = {};
    if (required !== undefined) {
      q.required = required;
      masks.push("questionItem.question.required");
      changes.push(required ? "agora obrigatória" : "agora opcional");
    }
    if (options) {
      if (!existing.questionItem.question?.choiceQuestion) {
        return fail(
          `A pergunta na posição ${index} não é de escolha (é ${questionKind(existing.questionItem.question || {})}) — 'options' não se aplica.`
        );
      }
      q.choiceQuestion = { options: options.map((v) => ({ value: v })) };
      masks.push("questionItem.question.choiceQuestion.options");
      changes.push("alternativas");
    }
    if (points !== undefined || correctAnswers !== undefined) {
      if (!form.settings?.quizSettings?.isQuiz) {
        return fail(
          "Este formulário não está em modo quiz — pontos e gabarito só existem em quizzes. Rode set_quiz com isQuiz=true antes."
        );
      }
      // Mescla com a nota existente: mudar só os pontos preserva o gabarito, e vice-versa.
      const g = existing.questionItem.question?.grading || {};
      q.grading = { pointValue: points ?? g.pointValue ?? 0 };
      if (correctAnswers) {
        q.grading.correctAnswers = { answers: correctAnswers.map((v) => ({ value: v })) };
      } else if (g.correctAnswers) {
        q.grading.correctAnswers = g.correctAnswers;
      }
      masks.push("questionItem.question.grading");
      if (points !== undefined) changes.push("pontos");
      if (correctAnswers) changes.push("gabarito");
    }
    if (!masks.length) {
      return fail("Nada a alterar — informe pelo menos um campo (title, required, options, points ou correctAnswers).");
    }
    if (Object.keys(q).length) item.questionItem = { question: q };
    await batchUpdate(formId, [{ updateItem: { item, location: { index }, updateMask: masks.join(",") } }]);
    return text(`Pergunta "${existing.title || "(sem título)"}" (posição ${index}) atualizada: ${changes.join(", ")}.`);
  }
);

tool(
  "build_form",
  {
    title: "Criar formulário completo",
    description:
      "Cria um formulário inteiro numa única operação: título, descrição, modo quiz e todas as perguntas na ordem dada. " +
      "Prefira esta ferramenta a encadear create_form + várias add_question. " +
      "Por padrão o Google cria o formulário JÁ PUBLICADO; use unpublished=true para criá-lo como rascunho.",
    inputSchema: {
      title: z.string().describe("Título do formulário, visível para quem responde"),
      documentTitle: z.string().optional().describe("Nome do arquivo no Drive (opcional)"),
      description: z.string().optional().describe("Descrição exibida no topo do formulário (opcional)"),
      isQuiz: z
        .boolean()
        .optional()
        .describe("true para criar já em modo quiz (obrigatório se alguma pergunta tiver 'points')"),
      unpublished: z
        .boolean()
        .optional()
        .describe("true para criar como rascunho (ninguém responde até set_publish). Padrão: publicado."),
      questions: z
        .array(z.object(questionFields))
        .min(1)
        .max(50)
        .describe("Perguntas, na ordem em que devem aparecer no formulário"),
    },
  },
  async ({ title, documentTitle, description, isQuiz, unpublished, questions }) => {
    // Valida TODAS as perguntas antes de criar o formulário: se algo estiver
    // errado, o erro sai agora e nenhum formulário órfão fica para trás.
    if (!isQuiz && questions.some((q) => typeof q.points === "number")) {
      return fail(
        "Há pergunta com 'points', mas isQuiz não é true. Ative isQuiz para criar um quiz, ou remova os pontos."
      );
    }
    const builtItems = questions.map((q) => ({ title: q.title, questionItem: { question: buildQuestion(q) } }));

    const forms = getFormsClient();
    const res = await forms.forms.create({
      ...(unpublished ? { unpublished: true } : {}),
      requestBody: { info: { title, documentTitle: documentTitle || title } },
    });
    const f = res.data;

    const requests = [];
    if (description) requests.push({ updateFormInfo: { info: { description }, updateMask: "description" } });
    if (isQuiz) {
      requests.push({ updateSettings: { settings: { quizSettings: { isQuiz: true } }, updateMask: "quizSettings.isQuiz" } });
    }
    builtItems.forEach((item, i) => requests.push({ createItem: { item, location: { index: i } } }));
    try {
      await batchUpdate(f.formId, requests);
    } catch (e) {
      // O create deu certo mas o preenchimento não: avisa que existe um
      // formulário vazio e como aproveitá-lo ou descartá-lo.
      return fail(
        `O formulário foi criado (formId: ${f.formId}), mas o preenchimento falhou — ele está vazio. ` +
          `Motivo: ${friendlyError(e)}\n` +
          `Dá para preenchê-lo com add_question, ou apagá-lo no Drive. Editar: https://docs.google.com/forms/d/${f.formId}/edit`
      );
    }
    return text(
      [
        `Formulário "${title}" criado com ${questions.length} pergunta(s)${isQuiz ? " em modo quiz" : ""} (${publishStateLine(f)}).`,
        `formId: ${f.formId}`,
        `Editar: https://docs.google.com/forms/d/${f.formId}/edit`,
        `Responder: ${f.responderUri || "(disponível após publicar)"}`,
      ].join("\n")
    );
  }
);

// Insere um item sem pergunta (seção ou bloco de texto) com a mesma validação
// de posição do add_question. Retorna a posição usada ou uma mensagem de erro.
async function insertStaticItem(formId, item, index) {
  const form = await fetchForm(formId);
  const items = form.items || [];
  const at = index ?? items.length;
  if (at > items.length) {
    return { error: `Posição ${at} fora do intervalo: o formulário tem ${items.length} item(ns), então use 0 a ${items.length}.` };
  }
  await batchUpdate(formId, [{ createItem: { item, location: { index: at } } }]);
  return { at };
}

tool(
  "add_section",
  {
    title: "Adicionar seção",
    description:
      "Insere uma quebra de seção (nova página) no formulário: quem responde avança de seção com o botão 'Próxima'. " +
      "As posições contam todos os itens — confira com get_form.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      title: z.string().describe("Título da seção"),
      description: z.string().optional().describe("Texto exibido abaixo do título da seção (opcional)"),
      index: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Posição do novo item (0 = primeiro; contam todos os itens). Se omitido, entra no final."),
    },
  },
  async ({ formId, title, description, index }) => {
    const r = await insertStaticItem(formId, { title, description, pageBreakItem: {} }, index);
    if (r.error) return fail(r.error);
    return text(`Seção "${title}" adicionada na posição ${r.at} (contando todos os itens do formulário).`);
  }
);

tool(
  "add_text_item",
  {
    title: "Adicionar bloco de texto",
    description:
      "Insere um bloco de texto estático (título + texto explicativo) entre as perguntas — sem campo de resposta. " +
      "As posições contam todos os itens — confira com get_form.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      title: z.string().describe("Título do bloco"),
      description: z.string().optional().describe("Texto do bloco (opcional)"),
      index: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Posição do novo item (0 = primeiro; contam todos os itens). Se omitido, entra no final."),
    },
  },
  async ({ formId, title, description, index }) => {
    const r = await insertStaticItem(formId, { title, description, textItem: {} }, index);
    if (r.error) return fail(r.error);
    return text(`Bloco de texto "${title}" adicionado na posição ${r.at} (contando todos os itens do formulário).`);
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
    description:
      "Lista as respostas de um formulário, já com o enunciado de cada pergunta no lugar do código interno. " +
      "Vem em páginas (padrão: 50 por vez); se houver mais, a saída traz o pageToken da página seguinte.",
    inputSchema: {
      formId: z.string().describe("ID do formulário"),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe("Quantas respostas trazer por página (padrão 50)"),
      pageToken: z.string().optional().describe("Token da página seguinte, devolvido pela chamada anterior"),
    },
  },
  async ({ formId, pageSize, pageToken }) => {
    const forms = getFormsClient();
    // As duas buscas são independentes; rodam em paralelo.
    const [formRes, listRes] = await Promise.all([
      forms.forms.get({ formId }),
      forms.forms.responses.list({ formId, pageSize: pageSize ?? 50, ...(pageToken ? { pageToken } : {}) }),
    ]);
    // Mapa questionId -> enunciado, para deixar a saída legível.
    const titleById = {};
    for (const item of formRes.data.items || []) {
      const qid = item.questionItem?.question?.questionId;
      if (qid) titleById[qid] = item.title || "(sem título)";
    }
    const responses = listRes.data.responses || [];
    if (responses.length === 0) {
      return text(
        pageToken
          ? "Não há mais respostas nesta página."
          : "Nenhuma resposta ainda. (O formulário está publicado? Veja set_publish.)"
      );
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
    let out = `${responses.length} resposta(s) nesta página:\n\n` + blocks.join("\n\n");
    if (listRes.data.nextPageToken) {
      out += `\n\nHá mais respostas — chame list_responses de novo com pageToken: "${listRes.data.nextPageToken}".`;
    }
    return text(out);
  }
);

// --- Conexão (entrada/saída padrão) -----------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
