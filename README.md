# vigia_arboviroses
Sistema web para monitoramento epidemiológico de arboviroses.

## Como rodar o backend
1. `cd backend && npm install`
2. `npm start` e abra http://localhost:3000
3. Testes: `npm test`

Usuários ficam em `backend/data/users.json` (a integração com o banco de dados fica para a próxima sprint).

## Regras do login (US01)
- Erro de login retorna mensagem genérica (401)
- Após 5 senhas erradas seguidas o usuário fica bloqueado por 15 min (429)
- Login correto redireciona para o dashboard
