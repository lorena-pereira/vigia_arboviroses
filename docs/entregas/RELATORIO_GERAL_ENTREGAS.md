# Relatório geral — entregas ACEX II / Vigia Arboviroses

## Base analisada
O projeto foi baseado no ZIP `vigia_arboviroses-main.zip` enviado pelo grupo e consolidado com as implementações já produzidas para conexão MySQL, camadas e validação de pacientes. O projeto utiliza Node.js com ES Modules, Express, Docker Compose e MySQL 8.4.

## Mapa das entregas

| Entrega | Conteúdo | Pacote individual |
|---|---|---|
| Task 1 / 6.5.2 | Protótipo XLSX/DBF; comparação ExcelJS x SheetJS; leitura DBF com dbffile | `TASK_1_6_5_2_prototipo_leitura.zip` |
| Task 2 / 6.6.1 | Pool MySQL reutilizável via mysql2/promise e `.env`; teste `SELECT 1` | `TASK_2_6_6_1_modulo_conexao.zip` |
| Task 3 | Integração back-end/MySQL e operações CRUD, com documentação e código do backend | `TASK_3_integracao_backend_MySQL.zip` |
| Tasks 4 e 5 / 6.6.3 | Organização em camadas e migração da persistência de usuários para MySQL | `TASKS_4_E_5_organizacao_camadas.zip` |
| Task 6 / 6.9.3 | Validação server-side de CPF, CNS, nome e data de nascimento | `TASK_6_validacao_pacientes_servidor.zip` |

As Tasks 4 e 5 são idênticas no enunciado e compartilham uma única implementação. Não foi criado código duplicado.

## Resultado da análise do ZIP original
- O projeto já possuía backend Node.js/Express em ES Modules, autenticação por sessão e Docker Compose com MySQL.
- Existia `backend/data/users.json`, removido na implementação de persistência MySQL.
- Não foi encontrado `pacientes.json` no ZIP original. Portanto, não havia arquivo JSON de pacientes para remover nem dados de pacientes para migrar.
- Foram criadas tabelas `users` e `patients` por migração SQL.
- O CRUD de pacientes foi estruturado nas camadas route/controller/service/repository.

## Testes efetivamente executados neste ambiente

1. **Sintaxe JavaScript do backend:** 17 arquivos verificados com `node --check`; 0 erros.
2. **Sintaxe dos scripts independentes das Tasks 1 e 2:** 3 arquivos verificados com `node --check`; 0 erros.
3. **Testes unitários de validação e service de pacientes:** 8 testes executados; 8 aprovados; 0 falhas.
4. **Suíte completa do backend (`node --test`):** não foi aprovada. O teste de login não pôde carregar o servidor porque a dependência `express` não estava instalada (`ERR_MODULE_NOT_FOUND`). Os 8 testes de pacientes executaram e passaram.
5. **MySQL/Docker:** não foi possível executar a integração real neste ambiente. Não há resultado de conexão, migração ou CRUD real com MySQL a declarar.
6. **Protótipo XLSX/DBF:** os arquivos e o script foram inspecionados e a sintaxe foi verificada; a execução com as bibliotecas instaladas não foi realizada.
7. **Pool MySQL standalone:** a sintaxe foi verificada; a conexão `SELECT 1` e o cenário de falha dependem de MySQL/Docker e não foram executados.

## Como validar no ambiente do grupo

### Tasks 1 — protótipo
```bash
cd acex_ii_prototipo
npm install
npm start
```
Conferir as linhas impressas, acentos, datas, valores numéricos e campos vazios.

### Task 2 — módulo de conexão
```bash
cd acex_ii_mysql_conexao
npm install
cp .env.example .env
docker compose up -d mysql
npm run test:db
```
Para validar falha de conexão, parar o container e executar novamente `npm run test:db`. O script deve retornar código diferente de zero e exibir a falha.

### Tasks 3, 4 e 5 — projeto integrado
Na raiz do projeto:
```bash
cp .env.example .env
# preencher as credenciais e segredos locais
docker compose up -d --build
```
Se o banco já possuir volume anterior à migração:
```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm test
```
O seed requer `DEMO_*_PASSWORD` configuradas no `.env`. Não usar senhas de demonstração em produção.

### Task 6 — validação de pacientes
```bash
cd backend
node --test test/patient-validation.test.js
```
Depois, com MySQL ativo, testar `POST /api/pacientes` e `PUT /api/pacientes/:id` com CPF omitido, CPF válido, CPF inválido, CPF duplicado, CNS inválido, nome ausente e data futura. A duplicidade concorrente também deve ser confirmada pela constraint `UNIQUE` no MySQL.

## Pendências honestas
- Instalar dependências do backend e executar novamente a suíte completa.
- Subir MySQL/Docker e validar conexão, migração, seed e CRUD real.
- Executar Task 1 com `exceljs`, `xlsx` e `dbffile` instalados e, antes da Sprint 7, testar arquivos reais para confirmar o encoding DBF.
- Confirmar com o grupo o esquema de pacientes criado, pois o ZIP original não fornecia um modelo de dados nem arquivo `pacientes.json`.
