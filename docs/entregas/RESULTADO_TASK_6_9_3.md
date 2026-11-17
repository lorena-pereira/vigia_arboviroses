# Resultado — Task 6.9.3: Validação no servidor

Implementada sobre a versão integrada da task 6.6.3 (camadas e MySQL).

## Entregas

- Validação de CPF no serviço de pacientes: formato, 11 dígitos, dígitos verificadores e rejeição de sequências repetidas.
- CPF continua opcional; valores vazios são armazenados como `NULL`.
- Verificação de CPF já cadastrado antes de criar ou atualizar paciente, excluindo o próprio registro durante atualização.
- Validação de CNS informado: 15 dígitos, prefixos aceitos e módulo 11 ponderado.
- Validação de nome obrigatório e limite de 180 caracteres.
- Validação de data de nascimento real, formato `AAAA-MM-DD` e bloqueio de datas futuras.
- Repositório com consultas parametrizadas para verificar CPF/CNS existentes.
- Testes automatizados focados nas regras de validação.

## Verificação realizada neste ambiente

- `node --check` nos módulos alterados: aprovado.
- `node --test backend/test/patient-validation.test.js`: 7 testes aprovados.
- A suíte completa e a integração com MySQL/Docker não foram executadas neste ambiente porque as dependências do projeto não estão instaladas e o serviço MySQL/Docker não está disponível aqui.

## Como executar no projeto

```bash
cd backend
npm install
npm test
```

Para validar a persistência real, iniciar o MySQL conforme o `README.md` e testar POST/PUT `/api/pacientes` com CPF ausente, CPF inválido, CPF duplicado, CNS inválido e data futura.
