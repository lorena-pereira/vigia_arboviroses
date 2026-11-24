# Requisitos para corrigir a falha do CI — PR #12

## Contexto

O Pull Request **#12 — "Correcao timer"** implementa um temporizador de sessão e está associado à branch `correcao_timer`, cuja base é `main`.

A execução do workflow `CI` falhou na etapa **Verificar Prettier**.

## Evidência da falha

O job registrou:

```text
frontend/css/index.css
frontend/javascript/index.js
Code style issues found in 2 files. Run Prettier with --write to fix.
```

O processo terminou com o código de saída `1`.

## Requisitos de correção

1. Formatar os arquivos informados pelo Prettier sem alterar a lógica da aplicação.
2. Não modificar manualmente os resultados da formatação além do necessário.
3. Manter as alterações restritas ao escopo do PR.
4. Executar localmente os comandos de qualidade utilizados pelo CI.
5. Adicionar os arquivos formatados ao branch `correcao_timer`.
6. Confirmar no GitHub que a etapa **Verificar Prettier** passou.

## Passos recomendados

Na raiz do repositório, instale as dependências:

```bash
npm ci
```

Aplique a formatação do projeto:

```bash
npm run format
```

Esse script executa o Prettier nos arquivos JavaScript e CSS configurados em `backend` e `frontend`.

Para revisar somente os arquivos mencionados na falha:

```bash
npx prettier --write frontend/css/index.css frontend/javascript/index.js
```

Depois, confira as alterações:

```bash
git diff --stat
git diff -- frontend/css/index.css frontend/javascript/index.js
```

## Validação antes do envio

Execute na raiz do repositório:

```bash
npm run lint
npm run format:check
```

Valide o backend conforme configurado pelo workflow:

```bash
cd backend
npm ci
npm test
cd ..
```

Os requisitos serão atendidos quando todos os comandos terminarem sem erros.

## Commit e atualização do PR

```bash
git add frontend/css/index.css frontend/javascript/index.js
git diff --cached --check
git commit -m "fix: format CI-affected frontend files"
git push
```

Caso `npm run format` altere outros arquivos além dos dois exibidos na falha, revise o diff antes do commit e mantenha somente as alterações relacionadas à formatação necessária.

## Critérios de aceitação

- [ ] `frontend/css/index.css` está conforme o Prettier.
- [ ] `frontend/javascript/index.js` está conforme o Prettier.
- [ ] `npm run lint` finaliza sem erros.
- [ ] `npm run format:check` finaliza com código `0`.
- [ ] Os testes do backend finalizam sem erros.
- [ ] As alterações foram enviadas ao branch `correcao_timer`.
- [ ] O workflow `CI` conclui a etapa **Verificar Prettier** com sucesso.

## Referências

- [Pull Request #12](https://github.com/lorena-pereira/vigia_arboviroses/pull/12)
- [Job do CI que falhou](https://github.com/lorena-pereira/vigia_arboviroses/actions/runs/45318979408/job/138192586236?pr=12)
