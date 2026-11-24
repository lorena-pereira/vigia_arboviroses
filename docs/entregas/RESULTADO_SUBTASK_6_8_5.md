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

Foi criado o arquivo `backend/test/permissoes.test.js`, utilizando o módulo nativo de testes do Node.js.

Os testes realizam requisições HTTP ao servidor Express, utilizando sessões fictícias para representar os perfis:

- Administrador;
- Técnico de Vigilância;
- Gestor;
- Endemias.

Não foram realizadas alterações nos middlewares existentes, no banco de dados ou no frontend.

## 4. Cenários testados

- Tentativas de acesso à gestão de usuários por Técnico, Gestor e Endemias.
- Tentativas de acesso aos dados individuais de pacientes por Administrador, Gestor e Endemias.
- Requisições utilizando GET, POST, PUT, PATCH e DELETE.
- Validação do retorno HTTP 403.
- Verificação da ausência de dados sensíveis nas respostas de acesso negado.
- Validação do retorno HTTP 401 para requisições sem sessão.

## 5. Resultados de referência

| Verificação | Resultado |
|---|---|
| Testes da Subtask 8.5 | 44 aprovados |
| Testes com falha | 0 |
| Testes ignorados | 0 |
| Suíte completa | 79 aprovados |
| ESLint do novo arquivo | Aprovado |
| Prettier do novo arquivo | Aprovado |

Resultados obtidos em uma cópia da versão original disponibilizada para desenvolvimento da subtask.

## 6. Evidências

Os resultados da execução local devem ser registrados no arquivo `EVIDENCIA_SUBTASK_6_8_5.txt` e anexados ao respectivo cartão do Trello.

## 7. Observações e dependências

O prefixo `/api/usuarios` encontra-se protegido pelo middleware de autorização. Entretanto, na versão analisada, o módulo completo de gestão de usuários ainda não está implementado.

Após a disponibilização do módulo, os caminhos e métodos definitivos deverão ser comparados com os testes desenvolvidos.

A tentativa de exclusão física foi incluída como cenário negativo de autorização, não representando uma funcionalidade permitida pela matriz.

## 8. Conclusão

Os testes desenvolvidos comprovaram que os middlewares existentes bloqueiam as requisições não autorizadas nos caminhos testados, retornando HTTP 403 sem exposição de dados sensíveis.

A validação dos endpoints definitivos de gestão de usuários permanece condicionada à disponibilização do respectivo módulo.