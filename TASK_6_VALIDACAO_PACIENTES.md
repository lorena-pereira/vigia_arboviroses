# TASK 6 — Validação de pacientes no servidor (6.9.3)

## Regras implementadas
- Nome obrigatório e limitado a 180 caracteres.
- CPF opcional; quando informado, são removidos caracteres de formatação, verificados os 11 dígitos, rejeitadas sequências repetidas e calculados os dois dígitos verificadores.
- Unicidade de CPF verificada no service e reforçada por índice `UNIQUE` no MySQL.
- CNS opcional; quando informado, valida 15 dígitos e os algoritmos de cartão definitivo (prefixo 1/2) ou provisório (prefixo 7/8/9).
- Data de nascimento, quando informada, deve existir no calendário e não pode estar no futuro.
- Erros de validação retornam mensagem clara; duplicidade concorrente é tratada como HTTP 409 pelo controller e índice único no banco.

## Arquivos
- `backend/src/services/patientValidation.js`
- `backend/src/services/patientService.js`
- `backend/src/controllers/patientController.js`
- `backend/src/repositories/patientRepository.js`
- `backend/database/migrations/001_create_users_and_patients.sql`
- `backend/test/patient-validation.test.js`

## Testes
Execute:

```bash
cd backend
node --test test/patient-validation.test.js
```

O teste usa repositório falso para não depender do MySQL e cobre CPF válido/inválido, CPF opcional, duplicidade, CNS, datas, campo obrigatório e sequência CRUD do service. A verificação da restrição `UNIQUE` no banco e o tratamento de concorrência exigem MySQL real e devem ser validados com `docker compose up -d`.

## Limitações
O teste unitário não comprova a execução da consulta SQL nem a constraint em MySQL. A integração deve ser validada no ambiente Docker do projeto.
