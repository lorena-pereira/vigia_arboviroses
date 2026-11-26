# Subtask 6.8.5 — Testes de permissão

## 1. Objetivo

Implementar testes automatizados de autorização para os quatro perfis do Sistema Vigia Arboviroses, garantindo o bloqueio de operações não autorizadas e a ausência de dados sensíveis nas respostas de acesso negado.

## 2. Referências

- RF30 — Restrição de acesso aos dados individuais dos pacientes.
- RF33 — Gestão de usuários.
- Matriz de Permissões Vigia Arboviroses.
- Subtask 6.8.2 — Middleware de perfil.
- Subtask 6.7.3 — Proteção de rotas.

## 3. Implementação

O arquivo `backend/test/permissoes.test.js` usa o módulo nativo de testes do Node.js e envia requisições ao servidor Express.

Os testes fazem login pela API com contas fictícias preparadas no MySQL 8.4 isolado no Docker. As requisições usam os cookies de sessão emitidos pelo servidor para os quatro perfis.

- Administrador;
- Técnico de Vigilância;
- Gestor;
- Endemias.

## 4. Cenários testados

- Técnico, Gestor e Endemias recebem HTTP 403 ao tentar listar, consultar, criar, editar, ativar, desativar, atribuir perfil ou redefinir a senha de uma conta. A lista inclui `PUT` e `PATCH` para edição, `POST` e `PATCH` para redefinição de senha e `HEAD` nas rotas de leitura.
- Administrador, Gestor e Endemias recebem HTTP 403 nas tentativas de cadastrar paciente, listar pacientes, consultar um registro ou buscar por CPF.
- As respostas HTTP 403 em JSON contêm apenas `authenticated` e a mensagem genérica. As respostas a `HEAD` têm corpo vazio.
- A tentativa de exclusão física recebe HTTP 403 para os perfis sem acesso à gestão. Para Administrador, o servidor responde HTTP 404 e a conta continua disponível para consulta, cuja resposta contém apenas os campos públicos de gestão.
- Os quatro perfis alcançam a validação da rota de troca da própria senha. As rotas protegidas continuam respondendo HTTP 401 sem sessão.

## 5. Resultados em 26/11/2026

| Verificação | Resultado |
|---|---|
| Testes da Subtask 8.5 | 58 aprovados |
| Testes com falha | 0 |
| Testes ignorados | 0 |
| Suíte completa | 112 aprovados |
| ESLint | Aprovado |
| Prettier | Aprovado |

## 6. Evidências

O arquivo [EVIDENCIA_SUBTASK_6_8_5.txt](EVIDENCIA_SUBTASK_6_8_5.txt) registra a saída dos testes e os comandos de reprodução.

## 7. Escopo das rotas de pacientes

Em `/api/pacientes`, o cadastro via `POST` está implementado. Os testes de `GET` verificam o bloqueio pelo middleware do prefixo, que também se aplica a caminhos de consulta e busca.
