// Onde ficam as credenciais (client_secret*.json e config.json).
// Compartilhado pelo servidor e pelo script de autorização, nesta ordem:
//   1. $GOOGLE_FORMS_MCP_DIR — pasta escolhida pelo usuário via variável de ambiente;
//   2. credentials/ dentro do projeto, se a pasta existir (instalação por clone do repositório);
//   3. ~/.config/mcp-server-google-forms/ (instalação via npm/npx, onde a pasta do
//      pacote fica em um cache interno no qual o usuário não deve mexer).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function credentialsDir() {
  if (process.env.GOOGLE_FORMS_MCP_DIR) return process.env.GOOGLE_FORMS_MCP_DIR;
  const local = fileURLToPath(new URL("../credentials/", import.meta.url));
  if (fs.existsSync(local)) return local;
  return path.join(os.homedir(), ".config", "mcp-server-google-forms");
}

export function configPath() {
  return path.join(credentialsDir(), "config.json");
}

// Como rodar a autorização, conforme o tipo de instalação — usado em mensagens de erro.
export const TOKEN_HELP =
  "Rode 'npm run token' na raiz do projeto (instalação por clone) ou " +
  "'npx -p mcp-server-google-forms mcp-server-google-forms-token' (instalação via npm) para autorizar com o Google.";
