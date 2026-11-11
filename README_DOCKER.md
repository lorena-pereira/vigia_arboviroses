# Vigia Arboviroses — Guia completo do ambiente Docker (desenvolvimento)

**Subtask 6.3.2 — Dockerfile e `docker-compose.yml` | Sprint 6**  
**Público:** integrantes da equipe que executarão o projeto no Windows com PowerShell e Docker Desktop.  
**Escopo:** ambiente local de desenvolvimento; não é um guia de implantação em produção.

> **Objetivo:** iniciar três serviços (`app` com Node.js + nodemon, `db` com MySQL 8.4 e `adminer`), garantir a comunicação entre eles e comprovar que os dados do MySQL persistem após a recriação dos contêineres.

## 1. Conferir a estrutura do projeto

Os arquivos do pacote devem ser colocados **na raiz do repositório**, no mesmo nível das pastas `backend`, `frontend`, `db` e `docs`:

```text
vigia_arboviroses/
├── backend/
│   ├── src/
│   ├── server.js
│   ├── package.json
│   └── package-lock.json       # se existente
├── frontend/
├── db/
├── docs/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── .env                    # criado localmente; NÃO versionar
├── .gitignore
└── README_DOCKER.md
```

O `Dockerfile` fornecido pressupõe que a aplicação tenha o ponto de entrada **`backend/server.js`** e que o `backend/package.json` contenha suas dependências. Confirme esses caminhos antes de executar. Se o backend real tiver outro ponto de entrada, ajuste o `Dockerfile` ao repositório. O pacote não inclui nem substitui o código completo da aplicação.

No `.gitignore` existente, confira pelo menos estas linhas (adicione-as se estiverem ausentes; **não apague** as regras anteriores):

```gitignore
.env
**/node_modules/
```

O arquivo `.env.example` **pode** ser enviado ao GitHub, mas o `.env` **não**: ele conterá as credenciais do seu computador.

## 2. Preparar Docker Desktop e WSL2 no Windows

### 2.1. Instalar e verificar o WSL2

1. Abra o **PowerShell como administrador** (Iniciar → PowerShell → *Executar como administrador*).
2. Verifique o WSL:

   ```powershell
   wsl --status
   wsl --list --verbose
   ```

3. Se aparecer que o **Subsistema do Windows para Linux não está instalado**, execute:

   ```powershell
   wsl --install
   ```

4. **Reinicie o Windows**, se solicitado. Conclua a configuração inicial do Ubuntu caso seja aberta.
5. Configure o WSL2 como padrão e confira:

   ```powershell
   wsl --set-default-version 2
   wsl --status
   wsl --version
   ```

Se o Windows indicar que virtualização ou recursos opcionais estão desabilitados, siga a orientação exibida e os requisitos oficiais do Docker Desktop. Não exclua distribuições WSL para tentar corrigir a instalação.

### 2.2. Iniciar Docker Desktop

1. Instale/abra o **Docker Desktop** e utilize contêineres Linux.
2. Em **Settings → General**, confira a opção **Use WSL 2 based engine**, caso esteja disponível.
3. Verifique se o status do Docker Engine está como **Running / Engine running**.
4. No PowerShell:

   ```powershell
   docker --version
   docker compose version
   docker info
   ```

`docker info` precisa mostrar informações do **Server**; se retornar erro de conexão com `//./pipe/docker_engine`, o Engine ainda não está disponível.

**Se o Docker ficar parado em “Starting the Docker Engine...”**:

1. Feche o Docker Desktop pelo menu **Quit Docker Desktop** na área de notificação do Windows.
2. No PowerShell, execute `wsl --shutdown`.
3. Abra o Docker Desktop novamente e verifique `docker info`.
4. Se persistir, execute `wsl --update` como administrador, reinicie o Windows e repita a verificação.

> Não utilize **Reset to factory defaults** nem opções para apagar dados do Docker como primeira tentativa de correção: elas podem eliminar contêineres, volumes e dados locais.

Referências: [Instalação do WSL (Microsoft)](https://learn.microsoft.com/pt-br/windows/wsl/install) e [Docker Desktop com WSL2 (Docker)](https://docs.docker.com/desktop/features/wsl/).

## 3. Criar e preencher o arquivo `.env` (obrigatório)

### 3.1. Abrir a pasta do projeto

No PowerShell, navegue até a **raiz do seu repositório**. Exemplo, adaptando o caminho ao seu computador:

```powershell
cd "$HOME\OneDrive\Documentos\vigia_arboviroses"
```

### 3.2. Criar `.env` a partir de `.env.example`

**Opção A — pelo terminal (mais fácil):**

```powershell
Copy-Item .env.example .env
notepad .env
```

**Opção B — manualmente:** crie um arquivo chamado exatamente **`.env`** na raiz do projeto, abra `.env.example`, copie **todo o seu conteúdo** e cole no novo `.env`. No Windows, cuidado para não salvar como `.env.txt`.

O conteúdo inicial do `.env` será semelhante a:

```dotenv
APP_PORT=3000
ADMINER_PORT=8080
DB_FORWARD_PORT=3307

DB_NAME=vigia_arboviroses
DB_USER=vigia_app
DB_PASSWORD=SUBSTITUA_POR_SENHA_LOCAL_FORTE
DB_ROOT_PASSWORD=SUBSTITUA_POR_OUTRA_SENHA_LOCAL_FORTE
SESSION_SECRET=SUBSTITUA_POR_SEQUENCIA_ALEATORIA_DE_32_OU_MAIS_CARACTERES
```

**Não deixe nenhum dos três valores `SUBSTITUA_...` no `.env`!** Eles são exemplos, não são credenciais seguras. Use **três valores aleatórios diferentes** para `DB_PASSWORD`, `DB_ROOT_PASSWORD` e `SESSION_SECRET`.

### 3.3. Gerar senhas e a chave de sessão aleatoriamente

Você pode gerar um valor criptograficamente aleatório de 64 caracteres hexadecimais diretamente no **PowerShell**, sem instalar Node.js no Windows:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
```

Copie o resultado **somente para seu `.env` local**. Execute novamente esse bloco **duas vezes** para obter três valores distintos:

- Primeiro resultado → `DB_PASSWORD` (usuário da aplicação no MySQL).
- Segundo resultado → `DB_ROOT_PASSWORD` (administrador do MySQL).
- Terceiro resultado → `SESSION_SECRET` (segredo para assinaturas de sessão da aplicação).

Exemplo de **formato** (não use os valores fictícios abaixo como senhas reais):

```dotenv
DB_PASSWORD=COLE_O_PRIMEIRO_VALOR_ALEATORIO
DB_ROOT_PASSWORD=COLE_O_SEGUNDO_VALOR_ALEATORIO
SESSION_SECRET=COLE_O_TERCEIRO_VALOR_ALEATORIO
```

Salve o arquivo. Recomenda-se gerar uma chave de sessão **uma vez por ambiente** e mantê-la nos reinícios; gerar uma nova a cada inicialização pode invalidar sessões existentes.

> **Atenção:** não envie senhas, valores de `.env` ou capturas contendo credenciais para o GitHub, Trello ou mensagens. O `.env.example` deve continuar com placeholders.

## 4. Validar a configuração e iniciar os serviços

Com o Docker Desktop ativo e o PowerShell aberto na raiz do projeto:

```powershell
docker compose config --quiet
docker compose up -d --build
docker compose ps
```

**O que faz cada comando:**

1. `docker compose config --quiet` valida a configuração do Compose sem imprimir as credenciais interpoladas.
2. `docker compose up -d --build` constrói a imagem da aplicação e inicia os serviços em segundo plano.
3. `docker compose ps` mostra se os serviços estão em execução.

**Resultado esperado:**

- `db` — estado **Healthy** (MySQL pronto para receber conexões).
- `app` — estado **Up / Running** (backend Node.js em execução).
- `adminer` — estado **Up / Running** (interface de administração em execução).

O MySQL e o Adminer podem levar um pouco para inicializar na primeira execução. Se o `app` ficar reiniciando ou não abrir, inspecione os logs na seção 9.

| Serviço | Endereço externo (padrão) | Finalidade |
| --- | --- | --- |
| `app` | http://localhost:3000 | Aplicação Vigia Arboviroses |
| `adminer` | http://localhost:8080 | Administração do MySQL |
| `db` | `localhost:3307` (opcional) | Cliente MySQL instalado no Windows |

**Dentro da rede do Compose**, a aplicação e o Adminer acessam o banco usando o servidor **`db`** e a porta **`3306`**. Não altere `DB_HOST=db` para `localhost` dentro do contêiner da aplicação.

> Se alguma porta local já estiver sendo usada, altere `APP_PORT`, `ADMINER_PORT` ou `DB_FORWARD_PORT` no `.env` e recrie os serviços com `docker compose up -d --force-recreate`. A porta interna do MySQL continua sendo 3306.

## 5. Confirmar a conexão com o MySQL (sem problemas de aspas)

Em alguns computadores, o **PowerShell modifica a interpretação de aspas e variáveis** quando usamos uma linha longa com `docker compose exec ... sh -c`. Para evitar esse problema, prefira os passos interativos abaixo.

### 5.1. Entrar no contêiner do banco

No **PowerShell**:

```powershell
docker compose exec db sh
```

O terminal mudará para algo como `sh-5.1#`.

### 5.2. Executar a consulta usando a senha do ambiente

**Dentro do terminal Linux** do contêiner (não no PowerShell):

```sh
MYSQL_PWD="$MYSQL_PASSWORD" mysql --protocol=TCP -h 127.0.0.1 -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT 1 AS conexao_ok;"
```

O resultado esperado é uma coluna `conexao_ok` com valor `1`. Isso comprova que o MySQL aceitou a autenticação e a consulta.

Para verificar como a conta foi reconhecida:

```sh
MYSQL_PWD="$MYSQL_PASSWORD" mysql --protocol=TCP -h 127.0.0.1 -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT CURRENT_USER();"
```

**Para sair do terminal Linux**, execute:

```sh
exit
```

### 5.3. Verificar comunicação `app` → `db`

De volta ao **PowerShell**, execute:

```powershell
docker compose exec app node -e "const s=require('node:net').connect(3306,'db',()=>{console.log('Rede app -> db: OK');s.end()});s.on('error',e=>{console.error(e.message);process.exitCode=1})"
```

Se aparecer `Rede app -> db: OK`, o contêiner do Node.js consegue alcançar a porta MySQL na rede do Compose. **Esse teste não substitui a futura integração do backend usando `mysql2/promise`**, prevista na subtask 6.6.1.

## 6. Entrar no Adminer e conferir o banco

1. Abra **http://localhost:8080**.
2. Na tela de login, informe os campos abaixo:

   | Campo | Valor |
   | --- | --- |
   | **Sistema** | MySQL / MariaDB |
   | **Servidor** | `db` |
   | **Usuário** | O valor `DB_USER` do `.env` (por padrão `vigia_app`) |
   | **Senha** | O valor atual de `DB_PASSWORD` do `.env` |
   | **Base de dados** | O valor `DB_NAME` do `.env` (por padrão `vigia_arboviroses`) |

3. Clique em **Entrar**.
4. Se a conexão funcionar, aparecerá a interface de administração do banco. As tabelas definitivas do sistema só estarão presentes depois que forem criadas pelos scripts de banco das próximas subtasks.

**Não selecione “Login permanente” em máquinas compartilhadas.**

### Se aparecer `Access denied for user 'vigia_app'@'172.x.x.x'`

- O endereço `172.x.x.x` é um IP interno da rede do Docker; o fato de ele aparecer **não é, por si só, um erro**.
- Verifique se a senha usada no Adminer é **exatamente** o `DB_PASSWORD` do `.env`. Não é o `DB_ROOT_PASSWORD` e não é o `SESSION_SECRET`.
- Se a consulta da seção 5 funciona, mas o Adminer falha, você pode estar digitando uma senha diferente da configurada no contêiner, ou ter alterado o `.env` depois da inicialização original do banco.
- **Não compartilhe senhas para pedir suporte e não exclua o volume como primeira tentativa.** Veja a seção 10 para corrigir senhas em um banco já criado.

## 7. Testar a persistência do MySQL (passo a passo)

O objetivo é verificar se um dado gravado no banco continua existindo **depois de remover e recriar os contêineres**.

### 7.1. Criar a tabela de teste no Adminer

1. Entre em **http://localhost:8080** conforme a seção 6.
2. Abra a opção **Comando SQL**.
3. Cole o SQL abaixo e clique em **Executar**:

```sql
CREATE TABLE IF NOT EXISTS teste_persistencia (
    id INT PRIMARY KEY,
    mensagem VARCHAR(100)
);

INSERT IGNORE INTO teste_persistencia (id, mensagem)
VALUES (1, 'Docker funcionando');

SELECT * FROM teste_persistencia;
```

Resultado esperado:

```text
+----+--------------------+
| id | mensagem           |
+----+--------------------+
|  1 | Docker funcionando |
+----+--------------------+
```

`INSERT IGNORE` evita erro de chave duplicada caso você repita o teste por engano.

### 7.2. Remover e recriar os contêineres

No **PowerShell**, na raiz do projeto:

```powershell
docker compose down
docker compose up -d
docker compose ps
```

O `down` remove os contêineres e a rede padrão, mas **mantém o volume nomeado `mysql_data`**. O `up -d` cria os serviços novamente. Confirme que o MySQL voltou ao estado **Healthy**.

> **NÃO execute `docker compose down -v`!** A opção `-v` remove os volumes gerenciados pelo Compose, inclusive o que guarda os dados do MySQL. O volume não substitui uma estratégia de backup.

### 7.3. Confirmar o registro depois da recriação

1. Acesse novamente o Adminer e faça login.
2. Abra **Comando SQL** e execute:

```sql
SELECT * FROM teste_persistencia;
```

3. **Se a linha com `Docker funcionando` continuar aparecendo, a persistência foi validada.**
4. Depois do teste, remova **somente a tabela temporária**:

```sql
DROP TABLE teste_persistencia;
```

Esse teste não modifica as tabelas definitivas da aplicação. Não execute `DROP TABLE` em nenhuma outra tabela.

Referência: [Docker Compose — persistência de volumes](https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-docker-compose/).

## 8. Testar a recarga automática do Node.js com nodemon

1. No **PowerShell**, execute:

   ```powershell
   docker compose logs -f app
   ```

2. No VS Code, abra `backend/server.js`.
3. Adicione **temporariamente** ao final do arquivo, sem alterar a lógica:

   ```javascript
   // Teste de recarga automatica do Docker
   ```

4. Salve com `Ctrl + S`.
5. Observe o terminal dos logs. O esperado é ver algo como:

   ```text
   [nodemon] restarting due to changes...
   [nodemon] starting `node server.js`
   ```

6. Remova o comentário e salve novamente.
7. Pressione `Ctrl + C` **apenas na janela de logs** para interromper o acompanhamento. Isso não desliga os serviços iniciados com `-d`.
8. Acesse **http://localhost:3000** para confirmar que a aplicação responde.

Se `app` estiver em `Started`, mas a página não carregar, isso ainda não comprova que o Node.js está funcionando corretamente: examine os logs, o ponto de entrada `backend/server.js` e as dependências do `backend/package.json`.

## 9. Comandos úteis no dia a dia

Execute na raiz do repositório:

```powershell
# Listar os serviços e os estados
docker compose ps

# Ver os últimos logs da aplicação
docker compose logs --tail=50 app

# Acompanhar logs do backend continuamente
docker compose logs -f app

# Ver logs do MySQL
docker compose logs --tail=50 db

# Subir os serviços
docker compose up -d

# Reconstruir a imagem após alterações no Dockerfile/dependências
docker compose up -d --build

# Parar sem remover os contêineres
docker compose stop

# Parar e remover os contêineres, preservando os volumes
docker compose down
```

Alterações em arquivos `.js` devem ser detectadas pelo `nodemon`, mas alterações em `package.json`/`package-lock.json` podem exigir reconstrução ou reinstalação de dependências. **Não remova o volume `mysql_data` ao tentar corrigir dependências Node.js.**

## 10. Solução dos problemas encontrados pela equipe

### Erro A — Docker não encontra `//./pipe/docker_engine`

Mensagem típica:

```text
failed to connect to the docker API ... open //./pipe/docker_engine
The system cannot find the file specified.
```

**Causa provável:** Docker Engine não está em execução. Abra o Docker Desktop, verifique o WSL2 (seção 2) e confirme com `docker info` antes de usar `docker compose up`.

### Erro B — Docker Desktop preso em “Starting the Docker Engine...”

**Causa possível:** WSL2 não instalado, desatualizado ou parado. Execute `wsl --status` e `wsl --list --verbose`. Se estiver ausente, instale com `wsl --install` (seção 2). Se já existir, tente `wsl --shutdown`, reabra o Docker Desktop e, se necessário, atualize com `wsl --update`.

### Erro C — `ERROR 1064 (42000)` ao testar o MySQL

**Causa comum:** aspas e variáveis interpretadas incorretamente por uma linha longa do PowerShell ao executar `sh -c`.

**Solução:** entre primeiro com `docker compose exec db sh`, depois execute dentro do contêiner o comando da **seção 5.2**. Não confunda o terminal do PowerShell com o terminal `sh-5.1#`.

### Erro D — `ERROR 1045 (28000)` / `Access denied` ao digitar a senha

**Possíveis causas:** senha digitada incorretamente, senha de outro campo (`DB_ROOT_PASSWORD` em lugar de `DB_PASSWORD`) ou credenciais do MySQL já inicializadas com um valor antigo.

Para conferir as credenciais que o próprio contêiner está utilizando **sem exibir a senha**:

1. Entre com `docker compose exec db sh`.
2. Execute a consulta da **seção 5.2**, que utiliza `MYSQL_PWD="$MYSQL_PASSWORD"`.
3. Se funcionar, as credenciais do ambiente do contêiner são aceitas. Verifique a senha utilizada no Adminer e no `.env`.

**Atenção a um caso ocorrido no projeto:** `SUBSTITUA_POR_SENHA_LOCAL_FORTE` é texto de exemplo. Se o MySQL foi criado inicialmente com esse valor, ele passou a ser a senha verdadeira daquele usuário até que você a altere no MySQL. Atualizar **somente** o `.env` não atualiza senhas em contas já armazenadas no banco.

**Para trocar a senha do próprio usuário sem apagar os dados** (caso você ainda consiga autenticar com a senha antiga):

1. No PowerShell, execute `docker compose exec db sh`.
2. Dentro do contêiner, entre com:

   ```sh
   mysql -u "$MYSQL_USER" -p "$MYSQL_DATABASE"
   ```

3. Digite **a senha atual** do MySQL quando solicitada; nenhuma letra aparecerá na tela.
4. No prompt `mysql>`, confira a conta e troque a senha:

   ```sql
   SELECT CURRENT_USER();
   ALTER USER USER() IDENTIFIED BY 'COLOQUE_AQUI_UMA_SENHA_NOVA_E_FORTE';
   ```

5. Saia com `exit;` (MySQL) e `exit` (shell). Edite o **`.env` local**, colocando a **mesma nova senha** em `DB_PASSWORD`.
6. Recrie os serviços **sem remover o volume**:

   ```powershell
   docker compose up -d --force-recreate
   ```

7. Refaça o teste da seção 5 e o login no Adminer. Se o `ALTER USER` falhar por restrição de permissão ou política de senha, não exclua dados: solicite suporte para ajustar a conta com privilégios administrativos.

> A senha informada em SQL pode permanecer no histórico do cliente. Use somente ambiente local controlado e nunca compartilhe a instrução preenchida com a senha verdadeira. Se `DB_ROOT_PASSWORD` também estava com um placeholder, a senha do usuário `root` deve ser corrigida **separadamente**; alterar apenas a variável não troca a senha armazenada no MySQL.

Referência: [MySQL 8.4 — ALTER USER](https://dev.mysql.com/doc/refman/8.4/en/alter-user.html).

### Erro E — Site da aplicação não abre em `localhost:3000`

Confira:

```powershell
docker compose ps
docker compose logs --tail=100 app
```

Verifique se existem `backend/server.js`, `backend/package.json`, as dependências instaláveis e a porta 3000 livre. Um contêiner que chegou a `Started` pode encerrar depois devido a erro no código; confira seu estado e os logs.

### Erro F — `localhost:8080` abre, mas não há tabelas

Isso pode ser normal na subtask 6.3.2. O banco pode estar **vazio** até a criação dos scripts SQL. A implementação de `db/001_schema.sql` é da **subtask 6.2.3**, e a montagem/carga automática dos scripts é da **6.3.4**.

### Erro G — Mudou `.env`, mas o MySQL continua aceitando a senha anterior

Com um volume já inicializado, o MySQL **não reconfigura usuários e senhas** apenas porque o `.env` foi alterado. Use o procedimento seguro do **Erro D** e preserve os dados. Não rode `docker compose down -v` para “corrigir” senha em banco com informações importantes.

## 11. Evidências para encerrar a subtask no Trello

Confira estes cinco itens da checklist original:

- [ ] Criar Dockerfile para aplicação Node.js com recarga local.
- [ ] Criar `docker-compose.yml` com `app`, MySQL 8.4 e Adminer.
- [ ] Configurar volume persistente do banco e comunicação entre serviços.
- [ ] Criar `.env.example` sem credenciais reais.
- [ ] Subir os serviços e verificar a conexão inicial.

**Evidências recomendadas:** captura de `docker compose ps` com `db` em **Healthy** e os outros serviços em execução; consulta `SELECT 1 AS conexao_ok`; login no Adminer; registro `Docker funcionando` após `down`/`up`; e logs de reinicialização do nodemon após salvar um arquivo JS. Evite imagens contendo senhas, dados pessoais ou o arquivo `.env`.

Após os testes e a revisão previstos no fluxo da equipe, o cartão poderá ser movido para **Feito**.

## 12. Limites da subtask e próximas dependências

- Este guia cobre **infraestrutura local**, não login definitivo, integração do backend com MySQL, autenticação por perfil ou implantação em produção.
- O cadastro de pacientes do backend recebido anteriormente ainda gravava dados em JSON; o Compose **não migra automaticamente** essas informações para o MySQL.
- A **subtask 6.6.1** fará a conexão do backend com `mysql2/promise` usando `DB_HOST=db`, `DB_PORT=3306` e as outras variáveis.
- A **subtask 6.2.3** criará `db/001_schema.sql`; a **6.3.4** fará a carga automática pelo diretório `/docker-entrypoint-initdb.d`. Esses scripts de inicialização são executados automaticamente **somente quando o volume de dados está vazio**, não a cada reinício.
- Em produção será necessário configurar HTTPS, sessões persistentes, políticas de acesso, gestão de segredos e backup/restauração testados.
