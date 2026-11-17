# TASKS 4 e 5 — Organização do back-end em camadas (6.6.3)

As Tasks 4 e 5 têm a mesma descrição e os mesmos critérios. Para evitar duplicação e divergência de código, a implementação é compartilhada e este documento registra o atendimento às duas tarefas.

## Arquitetura
`routes → controllers → services → repositories → MySQL`

## Alterações
- Rotas de autenticação e pacientes separadas.
- Controllers responsáveis por entrada/saída HTTP.
- Services responsáveis por regras de negócio.
- Repositories concentram SQL parametrizado.
- Pool compartilhado em `backend/src/config/db.js`.
- Autenticação consulta a tabela `users`.
- CRUD de pacientes usa a tabela `patients`.
- Persistência de `backend/data/users.json` removida.
- O ZIP original não continha `pacientes.json`; não havia arquivo de pacientes para migrar ou remover.
- Migração SQL cria as tabelas necessárias.

## Execução
Siga o procedimento do `README.md` e `backend/README_CAMADAS.md`. Para banco já existente, execute `cd backend && npm run db:migrate`. Para contas de desenvolvimento, configure `DEMO_*_PASSWORD` no `.env` e execute `npm run db:seed`.

## Critério de conclusão
A organização em camadas e a substituição da persistência JSON estão implementadas. A validação de funcionamento integrado com MySQL depende da execução no ambiente Docker do grupo.
