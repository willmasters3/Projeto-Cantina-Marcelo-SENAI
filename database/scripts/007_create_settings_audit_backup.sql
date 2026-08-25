-- Projeto Cantina
-- Migration 007: Configuracoes, auditoria administrativa e backups
--
-- Script idempotente e nao destrutivo. Nao execute automaticamente: aplique
-- manualmente no banco depois de revisar o ambiente.

USE `projeto_cantina`;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `updated_by_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`),
  KEY `idx_system_settings_updated_by` (`updated_by_id`),
  CONSTRAINT `fk_system_settings_updated_by`
    FOREIGN KEY (`updated_by_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `acao` VARCHAR(100) NOT NULL,
  `resultado` ENUM('SUCESSO', 'FALHA') NOT NULL DEFAULT 'SUCESSO',
  `detalhes_json` JSON NULL DEFAULT NULL,
  `ip_address` VARCHAR(45) NULL DEFAULT NULL,
  `user_agent` VARCHAR(255) NULL DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_logs_usuario_data` (`usuario_id`, `criado_em`),
  KEY `idx_audit_logs_acao_data` (`acao`, `criado_em`),
  CONSTRAINT `fk_audit_logs_usuario`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `backup_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `tipo` ENUM('MANUAL', 'AUTOMATICO', 'SEGURANCA_RESTAURACAO', 'UPLOAD_RESTAURACAO') NOT NULL,
  `status` ENUM('EM_ANDAMENTO', 'SUCESSO', 'FALHA') NOT NULL DEFAULT 'EM_ANDAMENTO',
  `nome_arquivo` VARCHAR(255) NOT NULL,
  `nome_original` VARCHAR(255) NULL DEFAULT NULL,
  `caminho_armazenamento` VARCHAR(500) NOT NULL,
  `tamanho_bytes` BIGINT UNSIGNED NULL DEFAULT NULL,
  `auto_run_key` VARCHAR(40) NULL DEFAULT NULL,
  `criado_por_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `erro_mensagem` VARCHAR(1000) NULL DEFAULT NULL,
  `iniciado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `concluido_em` DATETIME NULL DEFAULT NULL,
  `excluido_em` DATETIME NULL DEFAULT NULL,
  `excluido_por_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_backup_records_nome_arquivo` (`nome_arquivo`),
  UNIQUE KEY `uq_backup_records_auto_run_key` (`auto_run_key`),
  KEY `idx_backup_records_status_data` (`status`, `concluido_em`),
  KEY `idx_backup_records_tipo_data` (`tipo`, `iniciado_em`),
  KEY `idx_backup_records_criado_por` (`criado_por_id`),
  KEY `idx_backup_records_excluido_por` (`excluido_por_id`),
  CONSTRAINT `fk_backup_records_criado_por`
    FOREIGN KEY (`criado_por_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_backup_records_excluido_por`
    FOREIGN KEY (`excluido_por_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `chk_backup_records_nome_arquivo`
    CHECK (
      CHAR_LENGTH(TRIM(`nome_arquivo`)) > 0
      AND LOCATE('/', `nome_arquivo`) = 0
      AND LOCATE(CHAR(92), `nome_arquivo`) = 0
      AND `nome_arquivo` LIKE '%.sql'
    ),
  CONSTRAINT `chk_backup_records_caminho`
    CHECK (
      CHAR_LENGTH(TRIM(`caminho_armazenamento`)) > 0
      AND `caminho_armazenamento` NOT LIKE '%..%'
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `backup_restore_records` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `backup_record_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `safety_backup_record_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `arquivo_origem` VARCHAR(255) NOT NULL,
  `realizado_por_id` BIGINT UNSIGNED NULL DEFAULT NULL,
  `status` ENUM('EM_ANDAMENTO', 'SUCESSO', 'FALHA') NOT NULL DEFAULT 'EM_ANDAMENTO',
  `erro_mensagem` VARCHAR(1000) NULL DEFAULT NULL,
  `iniciado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `concluido_em` DATETIME NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_backup_restore_backup` (`backup_record_id`),
  KEY `idx_backup_restore_safety` (`safety_backup_record_id`),
  KEY `idx_backup_restore_usuario_data` (`realizado_por_id`, `iniciado_em`),
  CONSTRAINT `fk_backup_restore_backup`
    FOREIGN KEY (`backup_record_id`)
    REFERENCES `backup_records` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_backup_restore_safety`
    FOREIGN KEY (`safety_backup_record_id`)
    REFERENCES `backup_records` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_backup_restore_usuario`
    FOREIGN KEY (`realizado_por_id`)
    REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO `system_settings`
  (`setting_key`, `setting_value`, `updated_by_id`)
VALUES
  ('terminal.codigo', 'CAIXA-01', NULL),
  ('terminal.nome_exibicao', 'CAIXA-01', NULL),
  ('terminal.ativo', 'true', NULL),
  ('monitor.screensaver_enabled', 'false', NULL),
  ('monitor.screensaver_image_filename', '', NULL),
  ('monitor.screensaver_image_mime', '', NULL),
  ('monitor.screensaver_image_size', '0', NULL),
  ('monitor.screensaver_idle_seconds', '60', NULL),
  ('monitor.screensaver_message', 'Toque na tela para consultar sua conta', NULL),
  ('monitor.privacy_clear_seconds', '30', NULL),
  ('backup.auto_enabled', 'false', NULL),
  ('backup.auto_time', '23:00', NULL),
  ('backup.retention_days', '15', NULL);
