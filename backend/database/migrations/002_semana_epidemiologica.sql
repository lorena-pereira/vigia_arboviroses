
/*
    Regra de negocio: Semana Epidemiologica (SE)

    - Inicio da semana: domingo.
    - Fim da semana: sabado.
    - A SE 1 possui pelo menos 4 dias do novo ano.
    - Calculada a partir da data dos primeiros sintomas.
*/

ALTER TABLE Notificacao
    DROP INDEX idx_notificacao_se,

    DROP COLUMN semana_epidemiologica,

    ADD COLUMN semana_epidemiologica TINYINT UNSIGNED
        GENERATED ALWAYS AS (
            MOD(YEARWEEK(data_1_sintoma, 6), 100)
        ) STORED
        AFTER data_1_sintoma,

    ADD COLUMN ano_epidemiologico SMALLINT UNSIGNED
        GENERATED ALWAYS AS (
            YEARWEEK(data_1_sintoma, 6) DIV 100
        ) STORED
        AFTER semana_epidemiologica,

    ADD INDEX idx_notificacao_ano_se (
        ano_epidemiologico,
        semana_epidemiologica
    );
