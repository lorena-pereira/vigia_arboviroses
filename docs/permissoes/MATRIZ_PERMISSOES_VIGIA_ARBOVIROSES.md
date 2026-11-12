# Vigia Arboviroses — Matriz de permissões

## Objetivo e fontes
Esta matriz especifica permissões *perfil × funcionalidade* e o conjunto mínimo de dados por perfil. Base: documento de requisitos v1.1 (RF28, RF29, RF30, RF33, RF34, RN03, RN06, RN07, RNF03 e RNF07) e plano de recuperação (6.8.1, 6.8.2 e 6.8.5).

**Perfis:** Administrador (A7), Técnico de Vigilância (A1), Gestor (A2) e Endemias (A3/A4). O munícipe (A5) e o Sinan (A6) **não** representam perfis autenticados desta matriz.

**Legenda:** **S** = permitido; **N** = negado; **A** = apenas agregados; **T** = somente ações/território atribuídos e campos mínimos; **X** = permitido exclusivamente após filtragem de campos conforme o perfil. O padrão é **NEGAR**.

## 1. Matriz perfil × funcionalidade
| ID | Funcionalidade | Requisito | Admin. | Técnico | Gestor | Endemias |
|---|---|---|:---:|:---:|:---:|:---:|
| 01 | Autenticação, logout e troca da própria senha | RF28, RF33 | S | S | S | S |
| 02 | Listar e consultar contas de usuários | RF33 | S | N | N | N |
| 03 | Criar, editar, ativar/desativar usuários e atribuir perfil | RF33 | S | N | N | N |
| 04 | Redefinir senha de outro usuário | RF33 | S | N | N | N |
| 05 | Cadastrar e editar pacientes | RF34 | N | S | N | N |
| 06 | Consultar/buscar pacientes por nome, CPF ou CNS | RF30, RF34 | N | S | N | N |
| 07 | Consultar ficha individual completa de caso | RF06, RF08, RF30 | N | S | N | N |
| 08 | Cadastrar/editar casos, exames e prontuário | RF03, RF06 | N | S | N | N |
| 09 | Alterar classificação e evolução do caso | RF07, RN03 | N | S | N | N |
| 10 | Importar Sinan e consolidar dados | RF01, RF02 | N | S | N | N |
| 11 | Ver/corrigir pendências da importação | RF04, RF05 | N | S | N | N |
| 12 | Corrigir endereço ou geolocalização individual | RF10–RF12 | N | S | N | N |
| 13 | Ver mapa de casos e calor por território | RF13–RF16, RF30 | N | S | A | T |
| 14 | Consultar indicadores, séries e dashboard | RF17, RF18, RF21 | N | S | S | N |
| 15 | Gerar/exportar relatórios e bases | RF19, RF30 | N | X | A | N |
| 16 | Definir limiar de alerta de incidência | RF20, RN06 | N | N | S | N |
| 17 | Consultar alertas territoriais de incidência | RF20 | N | S | S | N |
| 18 | Visualizar denúncias de focos | RF22–RF24 | N | S | A | T |
| 19 | Triar/encaminhar denúncia para Endemias | RF22, RF23 | N | S | N | N |
| 20 | Consultar lista semanal de ações de bloqueio | RF25, RF26 | N | S | N | T |
| 21 | Registrar retorno de ação de campo | RF27 | N | N | N | T |
| 22 | Consultar resultado agregado de ações de campo | RF25–RF27 | N | S | A | T |
| 23 | Ver metadados de auditoria (sem PII) | RF31, RNF07 | S | S | N | N |
| 24 | Consultar/exportar trilha de acesso a pacientes | RF31, RNF07 | N | S | N | N |

### Restrições específicas por funcionalidade
- **02 — Listar e consultar contas de usuários:** Não expor credenciais nem hash de senha.
- **03 — Criar, editar, ativar/desativar usuários e atribuir perfil:** Sem exclusão física de usuários.
- **04 — Redefinir senha de outro usuário:** Senha temporária e troca obrigatória no acesso.
- **07 — Consultar ficha individual completa de caso:** Inclui dados pessoais, clínicos e laboratoriais.
- **09 — Alterar classificação e evolução do caso:** Classificação alterada exclusivamente pelo Técnico.
- **13 — Ver mapa de casos e calor por território:** Gestor: bairros/agrupamentos, sem pontos de domicílio; Endemias: endereços de ordens atribuídas.
- **15 — Gerar/exportar relatórios e bases:** Técnico: dados operacionais permitidos; Gestor: arquivo apenas agregado.
- **18 — Visualizar denúncias de focos:** Endemias: somente denúncia do território/atribuição; sem dados do denunciante.
- **19 — Triar/encaminhar denúncia para Endemias:** Proposta operacional; validar com a Secretaria.
- **20 — Consultar lista semanal de ações de bloqueio:** Endemias: somente endereço, coordenadas e referência da ação atribuída.
- **21 — Registrar retorno de ação de campo:** Somente Endemias na própria ação/território.
- **22 — Consultar resultado agregado de ações de campo:** Gestor vê totais; Endemias vê apenas ações próprias.
- **23 — Ver metadados de auditoria (sem PII):** Operações com dados de saúde devem ser auditadas; acesso mínimo.
- **24 — Consultar/exportar trilha de acesso a pacientes:** Restrito a pessoal técnico autorizado; auditoria avançada é evolução.

## 2. Matriz de categorias de dados
| Categoria | Admin. | Técnico | Gestor | Endemias | Observação |
|---|---|---|---|---|---|
| Dados de conta do usuário (nome funcional, login, perfil, ativo) | S: gestão | S: próprios | S: próprios | S: próprios | Nunca expor senha/hash; evitar dados de outras contas. |
| Nome, CPF, CNS, telefone e demais identificadores de paciente | N | S | N | N | Técnico vê por necessidade operacional e com auditoria. |
| Data de nascimento, prontuário e vínculo paciente-notificação | N | S | N | N | Evitar associação indireta em resultados agregados. |
| Endereço residencial, CEP, número e coordenadas individuais | N | S | N | T: atribuídos | O Gestor não acessa domicílios individuais. |
| Agravo, CID, sintomas, exames, classificação e evolução individual | N | S | N | N | Nenhum dado clínico para Endemias. |
| Totais e indicadores por bairro, semana e período | N | S | S | N | Sem linhas individualizadas ou dados que reidentifiquem. |
| Denúncia: endereço/local do foco e código da ação | N | S | A: totais | T: atribuídos | Identidade/telefone de denunciante não vão para campo. |
| Ações de campo: endereço, ponto, código opaco e status | N | S | A: totais | T: atribuídos | Código de ação não deve ser identificador de paciente. |

**Regra não negociável do RF30:** somente o Técnico de Vigilância acessa identificação de pacientes; Administrador é administrador de *contas*, não uma conta com acesso clínico. Gestor não recebe nome, CPF, telefone nem fichas individuais. Endemias recebe apenas os endereços e as localizações relativos à sua atividade, sem dados clínicos.

## 3. Contrato de implementação (6.8.2, 6.8.4 e 6.8.5)
1. **Autenticação obrigatória:** ausência de sessão → HTTP 401; sessão válida mas função sem permissão → HTTP 403. Não confiar no menu como barreira de segurança. Usuário inativo não autentica.
2. **Middleware:** conferir permissão por função (`requireRole(...)` ou `requirePermission(...)`) antes de executar a rota, e conferir atribuição territorial no servidor para Endemias.
3. **Projeção de resposta:** sempre gerar resposta distinta por perfil (DTO/SELECT de colunas permitidas). Não buscar todos os dados e apenas ocultar colunas no front-end. Aplicar também a PDF, Excel, CSV, GeoJSON, logs e erros.
4. **Mapas:** Gestor recebe somente visualização territorial agregada (bairros/heatmap agregados); não devolver coordenadas de residências. Técnico recebe mapa operacional; Endemias somente os pontos endereçados de ações de sua atribuição.
5. **Gestão de usuários:** somente Administrador; jamais excluir fisicamente, apenas desativar; primeiro acesso exige troca de senha, com hash e sessões de acordo com RN07.
6. **Auditoria e minimização:** registrar usuário, ação, objeto e horário para acesso/alteração de dados de pacientes sem armazenar valores sensíveis nos logs técnicos.
7. **Regras padrão:** toda permissão não mapeada é negada; exceções requerem revisão do documento e aprovação.

### Contrato ilustrativo de retorno para Endemias
```json
{"acao_id_publico":"AC-001","endereco":"Rua Exemplo, nº 100, Bairro Exemplo","latitude":-14.8,"longitude":-40.8,"status_acao":"pendente"}
```
*Os valores acima são inteiramente fictícios; `acao_id_publico` não deve permitir reconstruir o identificador do paciente.*

### Exemplo de bloqueio e DTO (pseudocódigo)
```javascript
router.get('/api/usuarios', requireRole('ADMIN'), listarUsuarios);
router.get('/api/pacientes', requireRole('TECNICO'), listarPacientes);
router.get('/api/indicadores', requireRole('GESTOR','TECNICO'), indicadoresAgregados);
router.get('/api/acoes-campo', requireRole('ENDEMIAS','TECNICO'), atribuirEscopoTerritorial, projetarDadosPermitidos);
```
A sintaxe é ilustrativa. As rotas reais devem seguir a estrutura vigente do projeto, ainda não inspecionada nesta subtask.

## 4. Casos de teste derivados da matriz (6.8.5)
| Teste | Perfil/contexto | Operação de exemplo | Resultado esperado |
|---|---|---|---|
| T01 | Sem sessão | GET /api/pacientes | 401; nenhuma informação interna é devolvida. |
| T02 | Perfil fora da regra | GET /api/usuarios como Gestor/Técnico/Endemias | 403, mesmo por URL direta. |
| T03 | Administrador | GET /api/pacientes | 403; administração não concede acesso clínico. |
| T04 | Técnico | GET /api/pacientes e busca por CPF/CNS | 200; somente Técnico recebe campos identificáveis. |
| T05 | Gestor | GET /api/indicadores e exportação agregada | 200; sem nome/CPF/CNS/telefone/endereço individual. |
| T06 | Gestor | GET /api/casos/:id ou /api/pacientes/:id | 403; não pode receber objeto individual. |
| T07 | Endemias | GET /api/acoes-campo | 200; somente ações atribuídas, endereço/localização, código opaco e status. |
| T08 | Endemias | GET /api/acoes-campo/:id de outro território | 403 ou 404; sem vazamento de existência/dados. |
| T09 | Endemias | Resposta JSON de ação | Sem campos clínicos, paciente, CPF, telefone, CNS, agravo ou classificação. |
| T10 | Endemias | PATCH /api/acoes-campo/:id de sua atribuição | 200 se válido; não pode alterar paciente nem caso. |
| T11 | Técnico | POST importação e PATCH classificação | Permitido; Gestor/Admin/Endemias recebem 403. |
| T12 | Qualquer perfil | Troca de senha no primeiro login | Obrigatória antes de funções internas; não usar senha inativa. |
| T13 | Usuário inativo | POST /login | Autenticação negada; histórico de usuário permanece. |
| T14 | Todas as saídas | Tela, endpoint, PDF/CSV/XLSX e GeoJSON | Mesma regra de projeção; sem chaves sensíveis indevidas. |
| T15 | Gestor | Mapa geográfico | Somente representação agregada; não apresentar residência exata. |
| T16 | Ações em campo | Listagem com filtros manipulados pelo cliente | Escopo territorial aplicado no servidor, não apenas no front-end. |

## 5. Aprovação e alinhamentos pendentes
- **P7:** matriz aprovada conforme informado pelo solicitante em 12/11/2026. Ajustes futuros devem ser documentados e versionados.
- **Secretaria:** confirmar os limites de visibilidade por território, modo de entrega da lista semanal e permissões de mapas/denúncias na apresentação de 19/11/2026.
- **P3 e P5:** implementar as travas no backend, respostas filtradas e menus/rotas compatíveis; **P7:** automatizar os testes de permissão.
