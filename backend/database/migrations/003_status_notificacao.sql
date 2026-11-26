/* As notificações novas da API são gravadas como PROVAVEL.
   Registros anteriores e importados podem ter status desconhecido. */
ALTER TABLE Notificacao ADD COLUMN status VARCHAR(20) NULL;
