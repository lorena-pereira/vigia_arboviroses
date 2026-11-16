# TASK 3 — Integração do back-end com MySQL e operações CRUD

## Escopo
Esta entrega documenta a integração do back-end com o MySQL já incorporada ao projeto. A conexão é centralizada em `backend/src/config/db.js`; os módulos de acesso ao banco ficam em `backend/src/repositories/`; regras de negócio ficam em `backend/src/services/`; os controllers tratam HTTP e as routes expõem os endpoints.

## Arquivos principais
- `backend/src/config/db.js`: pool compartilhado `mysql2/promise`, leitura de `.env`, teste `SELECT 1` e encerramento.
- `backend/src/repositories/userRepository.js`: consulta de usuários para autenticação.
- `backend/src/repositories/patientRepository.js`: operações SQL de pacientes.
- `backend/src/services/authService.js`: autenticação usando repositório.
- `backend/src/services/patientService.js`: operações de negócio e validações de pacientes.
- `backend/src/controllers/`: conversão de resultados/erros em respostas HTTP.
- `backend/src/routes/`: endpoints de autenticação e pacientes.
- `backend/database/migrations/001_create_users_and_patients.sql`: tabelas `users` e `patients`.
- `backend/scripts/run-migrations.js`: aplicação da migração.

## Configuração e execução
Na raiz do repositório:

```bash
cp .env.example .env
# Edite as credenciais do banco no .env
docker compose up -d --build
```

Se o volume do MySQL já existia antes da criação da migração:

```bash
cd backend
npm install
npm run db:migrate
npm run db:seed
npm test
```

O `db:seed` exige as variáveis `DEMO_*_PASSWORD` definidas no `.env`. Não use senhas de demonstração em produção.

## CRUD de pacientes
As rotas disponíveis são:
- `GET /api/pacientes`
- `GET /api/pacientes/:id`
- `POST /api/pacientes`
- `PUT /api/pacientes/:id`
- `DELETE /api/pacientes/:id`

Todas são protegidas pelo middleware de sessão/perfil existente no projeto.

## Testes e limitações
O teste unitário `backend/test/patient-validation.test.js` percorre o fluxo CRUD do service com repositório falso e verifica as chamadas de criação, listagem, consulta, atualização e remoção. O teste não substitui um teste de integração com MySQL real.

A execução de integração requer Docker e as dependências Node instaladas no ambiente do grupo. Execute `npm test` com o MySQL em execução para validar a comunicação ponta a ponta. Não declare o teste de integração aprovado sem executar esse procedimento.
