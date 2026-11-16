# Vigia Arboviroses

Sistema web para monitoramento epidemiológico de arboviroses.

## Backend

O backend utiliza Node.js (ES Modules), Express 5 e MySQL 8.4. A persistência é organizada em camadas:

`routes → controllers → services → repositories → MySQL`

### Configuração e execução com Docker

1. Copie `.env.example` para `.env` na raiz do repositório.
2. Altere as senhas e o segredo de sessão para valores locais seguros.
3. Suba os serviços:

```bash
docker compose up -d --build
```

O MySQL executa automaticamente a migração inicial ao criar o volume pela primeira vez.

### Instalar dependências localmente

```bash
cd backend
npm install
```

Configure `backend/.env` para desenvolvimento local, com `DB_HOST=127.0.0.1` e `DB_PORT=3307` se o MySQL estiver sendo acessado pela porta publicada no Compose. Para o backend executando dentro do Compose, use `DB_HOST=db` e `DB_PORT=3306`.

### Migrações e contas de demonstração

Com o banco disponível e variáveis do banco configuradas no ambiente do backend:

```bash
cd backend
npm run db:migrate
npm run db:seed
```

O seed cria contas de demonstração usando hashes scrypt. As credenciais de demonstração devem ser alteradas antes de qualquer uso fora do ambiente local.

### Testes

```bash
cd backend
npm test
```

Os testes unitários não exigem MySQL. Para testar o login HTTP com banco real, suba o Compose, aplique a migração e execute o seed.

## Arquitetura do backend

- `src/routes`: definição de endpoints.
- `src/controllers`: tratamento HTTP e respostas.
- `src/services`: regras de negócio e validações.
- `src/repositories`: consultas SQL.
- `src/config/db.js`: pool compartilhado `mysql2/promise`.
- `database/migrations`: estrutura inicial das tabelas.

## Usuários e pacientes

As contas são consultadas no MySQL. O arquivo antigo `backend/data/users.json` foi removido. Não existe `pacientes.json` no repositório recebido; a tabela `patients` e suas camadas de acesso foram preparadas para substituir qualquer persistência JSON anterior.

As rotas `/api/pacientes` exigem sessão autenticada com perfil `tecnico_vigilancia`, conforme a diretriz de acesso restrito aos dados identificáveis de pacientes descrita na matriz de permissões. Os campos da tabela inicial são nome, CPF, CNS, telefone e data de nascimento; confirme o modelo de dados oficial antes de ampliar a migração.

## Rotas atuais

- `POST /login`: autenticação.
- `GET /api/session`: validação da sessão.
- `POST /logout`: encerramento da sessão.
- `/api/pacientes`: operações CRUD restritas ao perfil Técnico de Vigilância.

## Segurança

- Senhas de usuários armazenadas como hash scrypt, nunca em texto puro.
- Credenciais reais ficam no `.env`, que não deve ser versionado.
- A aplicação não registra dados pessoais de pacientes em logs.
- O acesso aos dados identificáveis de pacientes é restrito ao perfil técnico autorizado.


## Cadastro de pacientes (interface)

A tela `frontend/html/cadastrar-paciente.html` foi integrada ao backend com persistência MySQL. O formulário encaminha ao endpoint `POST /api/pacientes` os campos atualmente cobertos pela migração inicial: nome, CPF, CNS, telefone e data de nascimento. Os demais campos visuais do formulário ainda não fazem parte da tabela `patients` e, portanto, não são persistidos nesta versão.

A página é acessada pelo menu **Pacientes → Cadastrar Paciente**. O endpoint continua protegido pelo perfil Técnico de Vigilância.
