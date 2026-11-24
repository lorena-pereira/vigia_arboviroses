/* 001_schema.sql - Vigia Arboviroses
   Baseado no brModelo (Logico_1) com ajustes manuais de restricoes, indices e seguranca.
   Executado automaticamente pelo Docker na primeira subida do banco (6.3.4).
   Nao contem CREATE/USE DATABASE: o banco e criado pelo MYSQL_DATABASE do .env. */

CREATE TABLE Paciente (
    cpf CHAR(11) UNIQUE,
    nome VARCHAR(150) NOT NULL,
    data_nascimento DATE,
    sexo ENUM('MASCULINO', 'FEMININO', 'IGNORADO'),
    raca_cor ENUM('BRANCA', 'PRETA', 'AMARELA', 'PARDA', 'INDIGENA', 'IGNORADO'),
    cartao_sus CHAR(15) UNIQUE,
    nome_mae VARCHAR(150),
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_Endereco_id INT UNSIGNED
);

CREATE TABLE Bairro (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    regiao VARCHAR(100)
);

CREATE TABLE Unidade (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    responsavel VARCHAR(150),
    codigo_cnes CHAR(7) UNIQUE,
    fk_Endereco_id INT UNSIGNED NOT NULL
);

CREATE TABLE Notificacao (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    data_notificacao DATE NOT NULL,
    data_1_sintoma DATE,
    evolucao_caso ENUM('CURA', 'OBITO_PELO_AGRAVO', 'OBITO_POR_OUTRAS_CAUSAS', 'OBITO_EM_INVESTIGACAO', 'IGNORADO'),
    uf CHAR(2),
    municipio VARCHAR(100),
    numero_sinan VARCHAR(30) UNIQUE,
    data_investigacao DATE,
    classificacao_final ENUM('DESCARTADO', 'DENGUE', 'DENGUE_COM_SINAIS_DE_ALARME', 'DENGUE_GRAVE', 'CHIKUNGUNYA'),
    criterio_confirmacao ENUM('LABORATORIAL', 'CLINICO_EPIDEMIOLOGICO', 'EM_INVESTIGACAO'),
    data_encerramento DATE,
    hospitalizado ENUM('SIM', 'NAO', 'IGNORADO'),
    gestante ENUM('PRIMEIRO_TRIMESTRE', 'SEGUNDO_TRIMESTRE', 'TERCEIRO_TRIMESTRE', 'IDADE_GESTACIONAL_IGNORADA', 'NAO', 'NAO_SE_APLICA', 'IGNORADO'),
    semana_epidemiologica INT UNSIGNED,
    escolaridade ENUM('ANALFABETO', 'FUNDAMENTAL_1_A_4_INCOMPLETO', 'FUNDAMENTAL_4_COMPLETO', 'FUNDAMENTAL_5_A_8_INCOMPLETO', 'FUNDAMENTAL_COMPLETO', 'MEDIO_INCOMPLETO', 'MEDIO_COMPLETO', 'SUPERIOR_INCOMPLETO', 'SUPERIOR_COMPLETO', 'IGNORADO', 'NAO_SE_APLICA'),
    fk_Unidade_Notificacao_id INT UNSIGNED NOT NULL,
    fk_Paciente_id INT UNSIGNED NOT NULL,
    fk_Doenca_id INT UNSIGNED NOT NULL,
    fk_Endereco_id INT UNSIGNED,
    fk_Usuario_id INT UNSIGNED NOT NULL,
    fk_Importacao_id INT UNSIGNED,
    fk_Unidade_Acompanhamento_id INT UNSIGNED
);

CREATE TABLE Monitoramento (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    observacao TEXT,
    situacao ENUM('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO') NOT NULL,
    tipo_acao VARCHAR(50),
    data_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    proxima_acao_em DATETIME,
    data_acao DATETIME,
    fk_Notificacao_id INT UNSIGNED NOT NULL,
    fk_Usuario_id INT UNSIGNED NOT NULL
);

CREATE TABLE Exame (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tipo_exame ENUM('NS1', 'SOROLOGIA_IGM', 'RT_PCR', 'ISOLAMENTO_VIRAL', 'PRNT', 'HISTOPATOLOGIA', 'IMUNOHISTOQUIMICA', 'OUTRO') NOT NULL,
    data_solicitacao DATE,
    data_coleta DATE,
    data_resultado DATE,
    resultado ENUM('POSITIVO', 'NEGATIVO', 'REAGENTE', 'NAO_REAGENTE', 'INCONCLUSIVO', 'NAO_REALIZADO'),
    numero_requisicao_gal VARCHAR(40),
    situacao_exame ENUM('SOLICITADO', 'AGUARDANDO_COLETA', 'COLETADO', 'EM_ANALISE', 'CONCLUIDO', 'CANCELADO'),
    observacao TEXT,
    fk_Notificacao_id INT UNSIGNED NOT NULL,
    fk_Usuario_id INT UNSIGNED NOT NULL
);

CREATE TABLE Doenca (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    cid VARCHAR(10)
);

CREATE TABLE Hospitalizacao (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    data_internacao DATE NOT NULL,
    nome_hospital VARCHAR(150),
    municipio_hospital VARCHAR(100),
    uf_hospital CHAR(2),
    data_alta DATE,
    situacao ENUM('EM_ANDAMENTO', 'ALTA', 'TRANSFERENCIA', 'OBITO', 'IGNORADO'),
    fk_Notificacao_id INT UNSIGNED NOT NULL,
    fk_Usuario_id INT UNSIGNED NOT NULL
);

CREATE TABLE Endereco (
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    cep CHAR(8),
    uf CHAR(2),
    municipio VARCHAR(100),
    distrito VARCHAR(100),
    complemento VARCHAR(100),
    longitude DECIMAL(10,7),
    latitude DECIMAL(10,7),
    ponto_de_referencia VARCHAR(200),
    zona ENUM('URBANA', 'RURAL', 'PERIURBANA', 'IGNORADO'),
    pais VARCHAR(100),
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_Bairro_id INT UNSIGNED
);

CREATE TABLE Usuario (
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    perfil ENUM('ADMINISTRADOR', 'TECNICO', 'GESTOR', 'ENDEMIAS') NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    login VARCHAR(50) NOT NULL UNIQUE,
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    senha_hash VARCHAR(255) NOT NULL,
    deve_trocar_senha BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE HistoricoAlteracao (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    acao ENUM('CRIACAO', 'ALTERACAO', 'EXCLUSAO') NOT NULL,
    entidade_afetada VARCHAR(100) NOT NULL,
    registro_afetado INT UNSIGNED NOT NULL,
    detalhes TEXT,
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valor_anterior JSON,
    valor_novo JSON,
    fk_Usuario_id INT UNSIGNED NOT NULL
);

CREATE TABLE Denuncia (
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    descricao TEXT NOT NULL,
    situacao ENUM('REGISTRADA', 'EM_ATENDIMENTO', 'ENCERRADA') NOT NULL DEFAULT 'REGISTRADA',
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_Endereco_id INT UNSIGNED NOT NULL
);

CREATE TABLE PopulacaoBairro (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ano SMALLINT UNSIGNED NOT NULL,
    populacao INT UNSIGNED NOT NULL,
    fk_Bairro_id INT UNSIGNED NOT NULL
);

CREATE TABLE Importacao (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nome_arquivo VARCHAR(255) NOT NULL,
    fk_Usuario_id INT UNSIGNED NOT NULL
);

CREATE TABLE AcaoCampo (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    data DATE,
    situacao ENUM('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA') NOT NULL DEFAULT 'PENDENTE',
    observacao TEXT,
    fk_Notificacao_id INT UNSIGNED,
    fk_Denuncia_id INT UNSIGNED,
    fk_Usuario_id INT UNSIGNED
);

/* Identificador de sessao armazenado como hash SHA-256 (hexadecimal), nunca o token bruto. */
CREATE TABLE Sessao (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fk_Usuario_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    data_criacao DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_expiracao DATETIME NOT NULL
);

CREATE TABLE TentativaLogin (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email_tentado VARCHAR(254) NOT NULL,
    fk_Usuario_id INT UNSIGNED,
    ip_origem VARCHAR(45),
    sucesso BOOLEAN NOT NULL,
    data_hora DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Telefone (
    telefone VARCHAR(20) NOT NULL,
    fk_Paciente_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (fk_Paciente_id, telefone)
);

ALTER TABLE Paciente ADD CONSTRAINT FK_Paciente_2
    FOREIGN KEY (fk_Endereco_id)
    REFERENCES Endereco (id)
    ON DELETE RESTRICT;

ALTER TABLE Unidade ADD CONSTRAINT FK_Unidade_2
    FOREIGN KEY (fk_Endereco_id)
    REFERENCES Endereco (id)
    ON DELETE RESTRICT;

ALTER TABLE Notificacao ADD CONSTRAINT FK_Notificacao_2
    FOREIGN KEY (fk_Unidade_Notificacao_id)
    REFERENCES Unidade (id)
    ON DELETE RESTRICT;

ALTER TABLE Notificacao ADD CONSTRAINT FK_Notificacao_3
    FOREIGN KEY (fk_Paciente_id)
    REFERENCES Paciente (id)
    ON DELETE RESTRICT;

ALTER TABLE Notificacao ADD CONSTRAINT FK_Notificacao_4
    FOREIGN KEY (fk_Doenca_id)
    REFERENCES Doenca (id)
    ON DELETE RESTRICT;

ALTER TABLE Notificacao ADD CONSTRAINT FK_Notificacao_5
    FOREIGN KEY (fk_Endereco_id)
    REFERENCES Endereco (id)
    ON DELETE RESTRICT;

ALTER TABLE Notificacao ADD CONSTRAINT FK_Notificacao_6
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE Notificacao ADD CONSTRAINT FK_Notificacao_7
    FOREIGN KEY (fk_Importacao_id)
    REFERENCES Importacao (id)
    ON DELETE SET NULL;

ALTER TABLE Notificacao ADD CONSTRAINT FK_Notificacao_8
    FOREIGN KEY (fk_Unidade_Acompanhamento_id)
    REFERENCES Unidade (id)
    ON DELETE SET NULL;

ALTER TABLE Monitoramento ADD CONSTRAINT FK_Monitoramento_2
    FOREIGN KEY (fk_Notificacao_id)
    REFERENCES Notificacao (id)
    ON DELETE RESTRICT;

ALTER TABLE Monitoramento ADD CONSTRAINT FK_Monitoramento_3
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE Exame ADD CONSTRAINT FK_Exame_2
    FOREIGN KEY (fk_Notificacao_id)
    REFERENCES Notificacao (id)
    ON DELETE RESTRICT;

ALTER TABLE Exame ADD CONSTRAINT FK_Exame_3
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE Hospitalizacao ADD CONSTRAINT FK_Hospitalizacao_2
    FOREIGN KEY (fk_Notificacao_id)
    REFERENCES Notificacao (id)
    ON DELETE RESTRICT;

ALTER TABLE Hospitalizacao ADD CONSTRAINT FK_Hospitalizacao_3
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE Endereco ADD CONSTRAINT FK_Endereco_2
    FOREIGN KEY (fk_Bairro_id)
    REFERENCES Bairro (id)
    ON DELETE SET NULL;

ALTER TABLE HistoricoAlteracao ADD CONSTRAINT FK_HistoricoAlteracao_2
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_2
    FOREIGN KEY (fk_Endereco_id)
    REFERENCES Endereco (id)
    ON DELETE RESTRICT;

ALTER TABLE PopulacaoBairro ADD CONSTRAINT FK_PopulacaoBairro_2
    FOREIGN KEY (fk_Bairro_id)
    REFERENCES Bairro (id)
    ON DELETE RESTRICT;

ALTER TABLE Importacao ADD CONSTRAINT FK_Importacao_2
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE AcaoCampo ADD CONSTRAINT FK_AcaoCampo_2
    FOREIGN KEY (fk_Notificacao_id)
    REFERENCES Notificacao (id)
    ON DELETE SET NULL;

ALTER TABLE AcaoCampo ADD CONSTRAINT FK_AcaoCampo_3
    FOREIGN KEY (fk_Denuncia_id)
    REFERENCES Denuncia (id)
    ON DELETE SET NULL;

ALTER TABLE AcaoCampo ADD CONSTRAINT FK_AcaoCampo_4
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE SET NULL;

ALTER TABLE Sessao ADD CONSTRAINT FK_Sessao_Usuario
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE TentativaLogin ADD CONSTRAINT FK_TentativaLogin_Usuario
    FOREIGN KEY (fk_Usuario_id)
    REFERENCES Usuario (id)
    ON DELETE RESTRICT;

ALTER TABLE Telefone ADD CONSTRAINT FK_Telefone_2
    FOREIGN KEY (fk_Paciente_id)
    REFERENCES Paciente (id)
    ON DELETE RESTRICT;

/* ---------- Ajustes manuais (fora do brModelo) ---------- */

/* Indices pedidos no card 2.2 (bairro e CPF ja sao indexados pela FK e pelo UNIQUE) */
CREATE INDEX idx_notificacao_data ON Notificacao (data_notificacao);
CREATE INDEX idx_notificacao_se   ON Notificacao (semana_epidemiologica);

/* Busca de pacientes por nome (card 9.2) */
CREATE INDEX idx_paciente_nome ON Paciente (nome);

/* Uma populacao por bairro por ano */
ALTER TABLE PopulacaoBairro ADD CONSTRAINT uq_populacao_bairro_ano
    UNIQUE (fk_Bairro_id, ano);

/* Apoio a expurgo de sessoes e investigacao de tentativas de login. */
CREATE INDEX idx_sessao_expiracao ON Sessao (data_expiracao);
CREATE INDEX idx_tentativa_login_ip_data ON TentativaLogin (ip_origem, data_hora);
CREATE INDEX idx_tentativa_login_email_data ON TentativaLogin (email_tentado, data_hora);

/* Data de alta nao pode ser anterior a internacao (existia no script antigo) */
ALTER TABLE Hospitalizacao ADD CONSTRAINT chk_data_alta
    CHECK (data_alta IS NULL OR data_alta >= data_internacao);
