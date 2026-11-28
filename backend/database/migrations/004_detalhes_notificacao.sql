ALTER TABLE Notificacao
    MODIFY classificacao_final ENUM('DESCARTADO', 'DENGUE', 'DENGUE_COM_SINAIS_DE_ALARME', 'DENGUE_GRAVE', 'CHIKUNGUNYA', 'ZIKA'),
    ADD COLUMN sinais_alarme JSON NULL,
    ADD COLUMN sinais_gravidade JSON NULL;

UPDATE Notificacao
SET status = CASE
    WHEN classificacao_final = 'DESCARTADO' THEN 'DESCARTADO'
    WHEN classificacao_final IS NOT NULL
        AND criterio_confirmacao IN ('LABORATORIAL', 'CLINICO_EPIDEMIOLOGICO')
        THEN 'CONFIRMADO'
    ELSE NULL
END;
