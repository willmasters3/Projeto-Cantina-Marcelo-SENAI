CREATE DATABASE  IF NOT EXISTS `projeto_cantina` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `projeto_cantina`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: projeto_cantina
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auth_sessions`
--

DROP TABLE IF EXISTS `auth_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `invalidated_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auth_sessions_token_hash` (`token_hash`),
  KEY `idx_auth_sessions_user_id` (`user_id`),
  CONSTRAINT `fk_auth_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_sessions`
--

LOCK TABLES `auth_sessions` WRITE;
/*!40000 ALTER TABLE `auth_sessions` DISABLE KEYS */;
INSERT INTO `auth_sessions` VALUES (1,1,'5c9057ce7554332a678e481cbddd05d56b457a509f56088ffb4c9c7d2935638d','2026-07-03 11:51:34','2026-07-03 19:51:34','2026-07-03 11:54:27','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'),(2,1,'2e01bbe1cb0e78b1b7043f05d46d4a3b69008f88b158a5bbe7e9da78423f8f90','2026-07-03 11:54:33','2026-07-03 19:54:34','2026-07-03 12:29:59','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'),(3,1,'27b707b6a76521e0f268631353f01efc51028a9432bdb0608f46ac2ba2f42960','2026-07-03 12:30:01','2026-07-03 20:30:01','2026-07-03 12:37:28','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'),(4,1,'5fa518d61d83fca04d95672262cc7c45a4106c4a400f5226fa1a8629c2aef1db','2026-07-03 12:37:29','2026-07-03 20:37:30','2026-07-03 12:46:52','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'),(5,1,'6319be3c132156f71b35bc5bb475d919dd40cff3018136cab51334ea2269a723','2026-07-03 12:46:53','2026-07-03 20:46:53','2026-07-03 13:28:38','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0'),(6,1,'b1470c38251ff1cb367f5760293cb821b7fddfc9edc910608fcfbd0a04fd502b','2026-07-03 13:28:39','2026-07-03 21:28:40',NULL,'::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0');
/*!40000 ALTER TABLE `auth_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cash_sessions`
--

DROP TABLE IF EXISTS `cash_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cash_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `terminal_codigo` varchar(50) NOT NULL DEFAULT 'CAIXA-01',
  `usuario_abertura_id` bigint unsigned NOT NULL,
  `usuario_fechamento_id` bigint unsigned DEFAULT NULL,
  `status` enum('ABERTA','FECHADA') NOT NULL DEFAULT 'ABERTA',
  `valor_abertura` decimal(15,4) unsigned NOT NULL DEFAULT '0.0000',
  `valor_fechamento_esperado` decimal(15,4) unsigned DEFAULT NULL,
  `valor_fechamento_informado` decimal(15,4) unsigned DEFAULT NULL,
  `diferenca_fechamento` decimal(15,4) GENERATED ALWAYS AS ((case when ((`valor_fechamento_esperado` is not null) and (`valor_fechamento_informado` is not null)) then (`valor_fechamento_informado` - `valor_fechamento_esperado`) else NULL end)) STORED,
  `justificativa_diferenca` varchar(500) DEFAULT NULL,
  `observacoes_abertura` varchar(500) DEFAULT NULL,
  `observacoes_fechamento` varchar(500) DEFAULT NULL,
  `aberto_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `fechado_em` datetime(6) DEFAULT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `aberta_unica` tinyint GENERATED ALWAYS AS ((case when (`status` = _utf8mb4'ABERTA') then 1 else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cash_session_terminal_open` (`terminal_codigo`,`aberta_unica`),
  KEY `idx_cash_session_status_data` (`status`,`aberto_em`),
  KEY `idx_cash_session_usuario` (`usuario_abertura_id`,`aberto_em`),
  KEY `fk_cash_session_usuario_fechamento` (`usuario_fechamento_id`),
  CONSTRAINT `fk_cash_session_usuario_abertura` FOREIGN KEY (`usuario_abertura_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_cash_session_usuario_fechamento` FOREIGN KEY (`usuario_fechamento_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_cash_session_fechamento` CHECK ((((`status` = _utf8mb4'ABERTA') and (`usuario_fechamento_id` is null) and (`fechado_em` is null) and (`valor_fechamento_esperado` is null) and (`valor_fechamento_informado` is null)) or ((`status` = _utf8mb4'FECHADA') and (`usuario_fechamento_id` is not null) and (`fechado_em` is not null) and (`valor_fechamento_esperado` is not null) and (`valor_fechamento_informado` is not null) and ((`valor_fechamento_esperado` = `valor_fechamento_informado`) or ((`justificativa_diferenca` is not null) and (char_length(trim(`justificativa_diferenca`)) > 0))))))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cash_sessions`
--

LOCK TABLES `cash_sessions` WRITE;
/*!40000 ALTER TABLE `cash_sessions` DISABLE KEYS */;
INSERT INTO `cash_sessions` (`id`, `terminal_codigo`, `usuario_abertura_id`, `usuario_fechamento_id`, `status`, `valor_abertura`, `valor_fechamento_esperado`, `valor_fechamento_informado`, `justificativa_diferenca`, `observacoes_abertura`, `observacoes_fechamento`, `aberto_em`, `fechado_em`, `criado_em`, `atualizado_em`) VALUES (1,'CAIXA-01',1,1,'FECHADA',1.0000,1.0000,1.0000,'Fechando o caixa','Bom dia','Ok','2026-07-03 14:28:26.503281','2026-07-03 14:29:28.994651','2026-07-03 14:28:26.503281','2026-07-03 14:29:28.994651'),(2,'CAIXA-01',1,1,'FECHADA',1.0000,1.0000,1.0000,'teste','Bom dia','teste','2026-07-03 14:30:30.702081','2026-07-03 18:11:10.646249','2026-07-03 14:30:30.702081','2026-07-03 18:11:10.646249'),(3,'CAIXA-01',1,1,'FECHADA',1.0000,1.0000,1.0000,'teste','teste','teste','2026-07-03 18:11:51.793804','2026-07-03 18:34:10.194366','2026-07-03 18:11:51.793804','2026-07-03 18:34:10.194366'),(4,'CAIXA-01',1,NULL,'ABERTA',1.0000,NULL,NULL,NULL,'teste',NULL,'2026-07-03 18:49:40.185176',NULL,'2026-07-03 18:49:40.185176','2026-07-03 18:49:40.185176');
/*!40000 ALTER TABLE `cash_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_nome` (`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Balas',1,'2026-07-03 12:37:36','2026-07-03 12:37:36'),(2,'Outros',1,'2026-07-03 14:31:32','2026-07-03 14:31:32');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) NOT NULL,
  `cpf` char(11) NOT NULL,
  `matricula` varchar(50) DEFAULT NULL,
  `telefone` varchar(30) DEFAULT NULL,
  `email` varchar(254) DEFAULT NULL,
  `codigo` varchar(24) NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `observacoes` text,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_clients_codigo` (`codigo`),
  UNIQUE KEY `uq_clients_cpf` (`cpf`),
  UNIQUE KEY `uq_clients_matricula` (`matricula`),
  KEY `idx_clients_nome` (`nome`),
  KEY `idx_clients_telefone` (`telefone`),
  KEY `idx_clients_email` (`email`),
  KEY `idx_clients_ativo_nome` (`ativo`,`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clients`
--

LOCK TABLES `clients` WRITE;
/*!40000 ALTER TABLE `clients` DISABLE KEYS */;
INSERT INTO `clients` VALUES (1,'William Pereira do Nascimento','01867552019','34076','+5551920062542','william_pereiranascimento@hotmail.com','CLI-000001',1,'Trabalha no Senai Gravataí - técnico de informatica.','2026-07-03 13:15:41','2026-07-03 13:19:59');
/*!40000 ALTER TABLE `clients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_account_entries`
--

DROP TABLE IF EXISTS `customer_account_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_account_entries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cliente_id` bigint unsigned NOT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `payment_id` bigint unsigned DEFAULT NULL,
  `lancamento_original_id` bigint unsigned DEFAULT NULL,
  `natureza` enum('DEBITO','CREDITO') NOT NULL,
  `origem` enum('VENDA_FIADO','PAGAMENTO_CLIENTE','CANCELAMENTO_VENDA','ESTORNO_PAGAMENTO','AJUSTE') NOT NULL,
  `valor` decimal(15,4) unsigned NOT NULL,
  `descricao` varchar(500) NOT NULL,
  `chave_idempotencia` varchar(100) NOT NULL,
  `usuario_id` bigint unsigned NOT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customer_entries_idempotencia` (`chave_idempotencia`),
  KEY `idx_customer_entries_cliente` (`cliente_id`,`criado_em`,`id`),
  KEY `idx_customer_entries_sale` (`sale_id`),
  KEY `idx_customer_entries_payment` (`payment_id`),
  KEY `idx_customer_entries_original` (`lancamento_original_id`),
  KEY `idx_customer_entries_origem` (`origem`,`criado_em`),
  KEY `fk_customer_entries_usuario` (`usuario_id`),
  CONSTRAINT `fk_customer_entries_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_customer_entries_original` FOREIGN KEY (`lancamento_original_id`) REFERENCES `customer_account_entries` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_customer_entries_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_customer_entries_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_customer_entries_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_customer_entries_origem` CHECK ((((`origem` = _utf8mb4'VENDA_FIADO') and (`natureza` = _utf8mb4'DEBITO') and (`sale_id` is not null)) or ((`origem` = _utf8mb4'PAGAMENTO_CLIENTE') and (`natureza` = _utf8mb4'CREDITO') and (`payment_id` is not null)) or ((`origem` = _utf8mb4'CANCELAMENTO_VENDA') and (`natureza` = _utf8mb4'CREDITO') and (`sale_id` is not null) and (`lancamento_original_id` is not null)) or ((`origem` = _utf8mb4'ESTORNO_PAGAMENTO') and (`natureza` = _utf8mb4'DEBITO') and (`payment_id` is not null) and (`lancamento_original_id` is not null)) or (`origem` = _utf8mb4'AJUSTE'))),
  CONSTRAINT `chk_customer_entries_valor` CHECK ((`valor` > 0.0000))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_account_entries`
--

LOCK TABLES `customer_account_entries` WRITE;
/*!40000 ALTER TABLE `customer_account_entries` DISABLE KEYS */;
INSERT INTO `customer_account_entries` VALUES (1,1,1,NULL,NULL,'DEBITO','VENDA_FIADO',4.0000,'Venda fiado #1','sale-debt-1',1,'2026-07-03 14:29:03.718776'),(2,1,2,NULL,NULL,'DEBITO','VENDA_FIADO',42.0000,'Venda fiado #2','sale-debt-2',1,'2026-07-03 14:34:55.068163'),(3,1,4,NULL,NULL,'DEBITO','VENDA_FIADO',6.0000,'Venda fiado #4','sale-debt-4',1,'2026-07-03 14:37:09.343903'),(4,1,5,NULL,NULL,'DEBITO','VENDA_FIADO',9.0000,'Venda fiado #5','sale-debt-5',1,'2026-07-03 18:50:38.431936');
/*!40000 ALTER TABLE `customer_account_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `login_attempts`
--

DROP TABLE IF EXISTS `login_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `successful` tinyint(1) NOT NULL DEFAULT '0',
  `reason` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attempted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_user_id` (`user_id`),
  KEY `idx_login_attempts_email` (`email`),
  KEY `idx_login_attempts_attempted_at` (`attempted_at`),
  CONSTRAINT `fk_login_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `login_attempts`
--

LOCK TABLES `login_attempts` WRITE;
/*!40000 ALTER TABLE `login_attempts` DISABLE KEYS */;
INSERT INTO `login_attempts` VALUES (1,1,'administrador@cantina.com.br','::1',0,'invalid_credentials','2026-07-03 11:51:09'),(2,1,'administrador@cantina.com.br','::1',1,'login_success','2026-07-03 11:51:34'),(3,1,'administrador@cantina.com.br','::1',1,'login_success','2026-07-03 11:54:33'),(4,1,'administrador@cantina.com.br','::1',1,'login_success','2026-07-03 12:30:01'),(5,1,'administrador@cantina.com.br','::1',1,'login_success','2026-07-03 12:37:29'),(6,1,'administrador@cantina.com.br','::1',1,'login_success','2026-07-03 12:46:53'),(7,1,'administrador@cantina.com.br','::1',1,'login_success','2026-07-03 13:28:39');
/*!40000 ALTER TABLE `login_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cash_session_id` bigint unsigned NOT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `cliente_id` bigint unsigned DEFAULT NULL,
  `pagamento_original_id` bigint unsigned DEFAULT NULL,
  `tipo_operacao` enum('PAGAMENTO','ESTORNO') NOT NULL DEFAULT 'PAGAMENTO',
  `finalidade` enum('VENDA','RECEBIMENTO_FIADO') NOT NULL,
  `forma_pagamento` enum('DINHEIRO','PIX','DEBITO','CREDITO','OUTROS') NOT NULL,
  `status` enum('PENDENTE','CONFIRMADO','CANCELADO') NOT NULL,
  `valor` decimal(15,4) unsigned NOT NULL,
  `provedor_externo` varchar(100) DEFAULT NULL,
  `identificador_externo` varchar(150) DEFAULT NULL,
  `nsu` varchar(100) DEFAULT NULL,
  `codigo_autorizacao` varchar(100) DEFAULT NULL,
  `referencia_transacao` varchar(150) DEFAULT NULL,
  `chave_idempotencia` varchar(100) NOT NULL,
  `usuario_registro_id` bigint unsigned NOT NULL,
  `usuario_confirmacao_id` bigint unsigned DEFAULT NULL,
  `usuario_cancelamento_id` bigint unsigned DEFAULT NULL,
  `registrado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `confirmado_em` datetime(6) DEFAULT NULL,
  `cancelado_em` datetime(6) DEFAULT NULL,
  `motivo_cancelamento` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_idempotencia` (`chave_idempotencia`),
  UNIQUE KEY `uq_payments_external` (`provedor_externo`,`identificador_externo`),
  KEY `idx_payments_cash_data` (`cash_session_id`,`registrado_em`),
  KEY `idx_payments_sale` (`sale_id`),
  KEY `idx_payments_cliente_data` (`cliente_id`,`registrado_em`),
  KEY `idx_payments_forma_data` (`forma_pagamento`,`confirmado_em`),
  KEY `idx_payments_finalidade_data` (`finalidade`,`confirmado_em`),
  KEY `idx_payments_status_data` (`status`,`registrado_em`),
  KEY `idx_payments_original` (`pagamento_original_id`),
  KEY `fk_payments_usuario_registro` (`usuario_registro_id`),
  KEY `fk_payments_usuario_confirmacao` (`usuario_confirmacao_id`),
  KEY `fk_payments_usuario_cancelamento` (`usuario_cancelamento_id`),
  CONSTRAINT `fk_payments_cash_session` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_payments_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_payments_original` FOREIGN KEY (`pagamento_original_id`) REFERENCES `payments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_payments_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_payments_usuario_cancelamento` FOREIGN KEY (`usuario_cancelamento_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_payments_usuario_confirmacao` FOREIGN KEY (`usuario_confirmacao_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_payments_usuario_registro` FOREIGN KEY (`usuario_registro_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_payments_finalidade` CHECK ((((`finalidade` = _utf8mb4'VENDA') and (`sale_id` is not null)) or ((`finalidade` = _utf8mb4'RECEBIMENTO_FIADO') and (`cliente_id` is not null)))),
  CONSTRAINT `chk_payments_operacao` CHECK ((((`tipo_operacao` = _utf8mb4'PAGAMENTO') and (`pagamento_original_id` is null)) or ((`tipo_operacao` = _utf8mb4'ESTORNO') and (`pagamento_original_id` is not null)))),
  CONSTRAINT `chk_payments_status` CHECK ((((`status` = _utf8mb4'PENDENTE') and (`confirmado_em` is null) and (`usuario_confirmacao_id` is null) and (`cancelado_em` is null) and (`usuario_cancelamento_id` is null)) or ((`status` = _utf8mb4'CONFIRMADO') and (`confirmado_em` is not null) and (`usuario_confirmacao_id` is not null) and (`cancelado_em` is null) and (`usuario_cancelamento_id` is null)) or ((`status` = _utf8mb4'CANCELADO') and (`confirmado_em` is null) and (`usuario_confirmacao_id` is null) and (`cancelado_em` is not null) and (`usuario_cancelamento_id` is not null) and (`motivo_cancelamento` is not null) and (char_length(trim(`motivo_cancelamento`)) > 0)))),
  CONSTRAINT `chk_payments_valor` CHECK ((`valor` > 0.0000))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,2,3,NULL,NULL,'PAGAMENTO','VENDA','PIX','CONFIRMADO',9.0000,NULL,NULL,NULL,NULL,NULL,'sale-payment-3-faf8162c-e3fb-40a3-af24-dd4d8b4c2d97',1,1,NULL,'2026-07-03 14:36:02.185280','2026-07-03 14:36:02.185280',NULL,NULL),(2,2,3,NULL,1,'ESTORNO','VENDA','PIX','CONFIRMADO',9.0000,NULL,NULL,NULL,NULL,'Cancelamento da venda #3','cancel-payment-3-1',1,1,NULL,'2026-07-03 14:36:21.728141','2026-07-03 14:36:21.728141',NULL,NULL),(3,4,6,NULL,NULL,'PAGAMENTO','VENDA','DINHEIRO','CONFIRMADO',4.0000,NULL,NULL,NULL,NULL,NULL,'sale-payment-6-0332025d-d127-4120-9842-d9aeda0f095b',1,1,NULL,'2026-07-03 18:52:03.932509','2026-07-03 18:52:03.932509',NULL,NULL);
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `categoria_id` bigint unsigned DEFAULT NULL,
  `codigo_barras` varchar(100) DEFAULT NULL,
  `nome` varchar(255) NOT NULL,
  `descricao` text,
  `preco_venda` decimal(13,4) unsigned NOT NULL,
  `custo` decimal(13,4) unsigned DEFAULT NULL,
  `estoque_atual` decimal(13,4) unsigned NOT NULL DEFAULT '0.0000',
  `estoque_minimo` decimal(13,4) unsigned NOT NULL DEFAULT '0.0000',
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_codigo_barras` (`codigo_barras`),
  KEY `idx_products_categoria_id` (`categoria_id`),
  KEY `idx_products_ativo_nome` (`ativo`,`nome`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,1,'78938816','Halls Preto','Embalagem padrão: Os clássicos bastidores com cerca de 27,5 g contêm aproximadamente 7 a 9 unidades.Displays e Sacos: São vendidos em grandes embalagens tipo display (geralmente com 21 unidades), facilitando a compra para o dia a dia',4.0000,1.5000,5.0000,2.0000,1,'2026-07-03 12:47:39','2026-07-03 18:52:03'),(2,2,'7896067202340','Bateria Panasonic CR2032','CR2032 é uma bateria para componentes eletronicos',5.0000,1.0000,19.0000,2.0000,1,'2026-07-03 14:32:33','2026-07-03 18:50:38');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_slug` (`slug`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMINISTRADOR','Administrador','Acesso total ao sistema','2026-07-03 11:50:50','2026-07-03 11:50:50'),(2,'OPERADOR_CAIXA','Operador de Caixa','Acesso a caixa, clientes e fiado','2026-07-03 11:50:50','2026-07-03 11:50:50'),(3,'CONSULTA','Consulta','Acesso apenas a relatórios e consultas','2026-07-03 11:50:50','2026-07-03 11:50:50');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` bigint unsigned NOT NULL,
  `produto_id` bigint unsigned DEFAULT NULL,
  `tipo_item` enum('PRODUTO','DIVERSOS') NOT NULL,
  `descricao` varchar(255) DEFAULT NULL,
  `codigo_barras` varchar(100) DEFAULT NULL,
  `quantidade` decimal(13,4) unsigned NOT NULL,
  `preco_unitario` decimal(13,4) unsigned NOT NULL,
  `custo_unitario` decimal(13,4) unsigned DEFAULT NULL,
  `desconto` decimal(15,4) unsigned NOT NULL DEFAULT '0.0000',
  `total_item` decimal(15,4) unsigned NOT NULL,
  `movimenta_estoque` tinyint(1) NOT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_sale_items_sale` (`sale_id`),
  KEY `idx_sale_items_produto` (`produto_id`),
  KEY `idx_sale_items_tipo` (`tipo_item`),
  CONSTRAINT `fk_sale_items_produto` FOREIGN KEY (`produto_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_sale_items_quantidade` CHECK ((`quantidade` > 0.0000)),
  CONSTRAINT `chk_sale_items_tipo` CHECK ((((`tipo_item` = _utf8mb4'PRODUTO') and (`produto_id` is not null) and (`descricao` is not null) and (char_length(trim(`descricao`)) > 0) and (`movimenta_estoque` = 1)) or ((`tipo_item` = _utf8mb4'DIVERSOS') and (`produto_id` is null) and (`movimenta_estoque` = 0) and (`preco_unitario` > 0.0000)))),
  CONSTRAINT `chk_sale_items_total` CHECK (((`desconto` <= (`quantidade` * `preco_unitario`)) and (`total_item` = ((`quantidade` * `preco_unitario`) - `desconto`))))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sale_items`
--

LOCK TABLES `sale_items` WRITE;
/*!40000 ALTER TABLE `sale_items` DISABLE KEYS */;
INSERT INTO `sale_items` VALUES (1,1,1,'PRODUTO','Halls Preto','78938816',1.0000,4.0000,1.5000,0.0000,4.0000,1,'2026-07-03 14:29:03.716312'),(2,2,1,'PRODUTO','Halls Preto','78938816',1.0000,4.0000,1.5000,0.0000,4.0000,1,'2026-07-03 14:34:55.065058'),(3,2,NULL,'DIVERSOS','Outros',NULL,1.0000,5.0000,NULL,0.0000,5.0000,0,'2026-07-03 14:34:55.066719'),(4,2,NULL,'DIVERSOS','Outros',NULL,1.0000,10.0000,NULL,0.0000,10.0000,0,'2026-07-03 14:34:55.067208'),(5,2,NULL,'DIVERSOS','Pastel',NULL,1.0000,23.0000,NULL,0.0000,23.0000,0,'2026-07-03 14:34:55.067681'),(6,3,1,'PRODUTO','Halls Preto','78938816',1.0000,4.0000,1.5000,0.0000,4.0000,1,'2026-07-03 14:36:02.182150'),(7,3,NULL,'DIVERSOS','Bateria',NULL,1.0000,5.0000,NULL,0.0000,5.0000,0,'2026-07-03 14:36:02.184315'),(8,4,1,'PRODUTO','Halls Preto','78938816',1.0000,4.0000,1.5000,0.0000,4.0000,1,'2026-07-03 14:37:09.341707'),(9,4,NULL,'DIVERSOS','Outros',NULL,1.0000,2.0000,NULL,0.0000,2.0000,0,'2026-07-03 14:37:09.343393'),(10,5,2,'PRODUTO','Bateria Panasonic CR2032','7896067202340',1.0000,5.0000,1.0000,0.0000,5.0000,1,'2026-07-03 18:50:38.427259'),(11,5,1,'PRODUTO','Halls Preto','78938816',1.0000,4.0000,1.5000,0.0000,4.0000,1,'2026-07-03 18:50:38.430415'),(12,6,1,'PRODUTO','Halls Preto','78938816',1.0000,4.0000,1.5000,0.0000,4.0000,1,'2026-07-03 18:52:03.929900');
/*!40000 ALTER TABLE `sale_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `cash_session_id` bigint unsigned NOT NULL,
  `operador_id` bigint unsigned NOT NULL,
  `cliente_id` bigint unsigned DEFAULT NULL,
  `tipo_venda` enum('A_VISTA','FIADO') NOT NULL,
  `status` enum('CONFIRMADA','CANCELADA') NOT NULL DEFAULT 'CONFIRMADA',
  `subtotal` decimal(15,4) unsigned NOT NULL,
  `desconto` decimal(15,4) unsigned NOT NULL DEFAULT '0.0000',
  `acrescimo` decimal(15,4) unsigned NOT NULL DEFAULT '0.0000',
  `total` decimal(15,4) unsigned NOT NULL,
  `observacoes` varchar(500) DEFAULT NULL,
  `confirmada_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `cancelada_em` datetime(6) DEFAULT NULL,
  `cancelada_por_id` bigint unsigned DEFAULT NULL,
  `motivo_cancelamento` varchar(500) DEFAULT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `atualizado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `idx_sales_cash_data` (`cash_session_id`,`confirmada_em`),
  KEY `idx_sales_operador_data` (`operador_id`,`confirmada_em`),
  KEY `idx_sales_cliente_data` (`cliente_id`,`confirmada_em`),
  KEY `idx_sales_status_data` (`status`,`confirmada_em`),
  KEY `idx_sales_tipo_data` (`tipo_venda`,`confirmada_em`),
  KEY `fk_sales_cancelada_por` (`cancelada_por_id`),
  CONSTRAINT `fk_sales_cancelada_por` FOREIGN KEY (`cancelada_por_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sales_cash_session` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sales_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `clients` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_sales_operador` FOREIGN KEY (`operador_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_sales_cancelamento` CHECK ((((`status` = _utf8mb4'CONFIRMADA') and (`cancelada_em` is null) and (`cancelada_por_id` is null) and (`motivo_cancelamento` is null)) or ((`status` = _utf8mb4'CANCELADA') and (`cancelada_em` is not null) and (`cancelada_por_id` is not null) and (`motivo_cancelamento` is not null) and (char_length(trim(`motivo_cancelamento`)) > 0)))),
  CONSTRAINT `chk_sales_cliente_fiado` CHECK (((`tipo_venda` <> _utf8mb4'FIADO') or (`cliente_id` is not null))),
  CONSTRAINT `chk_sales_total` CHECK (((`total` > 0.0000) and (`desconto` <= `subtotal`) and (`total` = ((`subtotal` - `desconto`) + `acrescimo`))))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES (1,1,1,1,'FIADO','CONFIRMADA',4.0000,0.0000,0.0000,4.0000,NULL,'2026-07-03 14:29:03.715690',NULL,NULL,NULL,'2026-07-03 14:29:03.715690','2026-07-03 14:29:03.715690'),(2,2,1,1,'FIADO','CONFIRMADA',42.0000,0.0000,0.0000,42.0000,NULL,'2026-07-03 14:34:55.064365',NULL,NULL,NULL,'2026-07-03 14:34:55.064365','2026-07-03 14:34:55.064365'),(3,2,1,NULL,'A_VISTA','CANCELADA',9.0000,0.0000,0.0000,9.0000,'Ola','2026-07-03 14:36:02.181509','2026-07-03 14:36:21.728920',1,'nao é em debito','2026-07-03 14:36:02.181509','2026-07-03 14:36:21.728920'),(4,2,1,1,'FIADO','CONFIRMADA',6.0000,0.0000,0.0000,6.0000,'teste','2026-07-03 14:37:09.341101',NULL,NULL,NULL,'2026-07-03 14:37:09.341101','2026-07-03 14:37:09.341101'),(5,4,1,1,'FIADO','CONFIRMADA',9.0000,0.0000,0.0000,9.0000,'Teste','2026-07-03 18:50:38.426268',NULL,NULL,NULL,'2026-07-03 18:50:38.426268','2026-07-03 18:50:38.426268'),(6,4,1,NULL,'A_VISTA','CONFIRMADA',4.0000,0.0000,0.0000,4.0000,NULL,'2026-07-03 18:52:03.929373',NULL,NULL,NULL,'2026-07-03 18:52:03.929373','2026-07-03 18:52:03.929373');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `produto_id` bigint unsigned NOT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `sale_item_id` bigint unsigned DEFAULT NULL,
  `movimento_original_id` bigint unsigned DEFAULT NULL,
  `natureza` enum('ENTRADA','SAIDA') NOT NULL,
  `origem` enum('VENDA','CANCELAMENTO_VENDA','AJUSTE','ENTRADA_INICIAL') NOT NULL,
  `quantidade` decimal(13,4) unsigned NOT NULL,
  `estoque_antes` decimal(13,4) unsigned NOT NULL,
  `estoque_depois` decimal(13,4) unsigned NOT NULL,
  `motivo` varchar(500) DEFAULT NULL,
  `chave_idempotencia` varchar(100) NOT NULL,
  `usuario_id` bigint unsigned NOT NULL,
  `criado_em` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_stock_movements_idempotencia` (`chave_idempotencia`),
  KEY `idx_stock_movements_produto` (`produto_id`,`criado_em`,`id`),
  KEY `idx_stock_movements_sale` (`sale_id`),
  KEY `idx_stock_movements_sale_item` (`sale_item_id`),
  KEY `idx_stock_movements_original` (`movimento_original_id`),
  KEY `idx_stock_movements_origem` (`origem`,`criado_em`),
  KEY `fk_stock_movements_usuario` (`usuario_id`),
  CONSTRAINT `fk_stock_movements_original` FOREIGN KEY (`movimento_original_id`) REFERENCES `stock_movements` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_stock_movements_produto` FOREIGN KEY (`produto_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_stock_movements_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_stock_movements_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_stock_movements_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_stock_movements_origem` CHECK ((((`origem` = _utf8mb4'VENDA') and (`natureza` = _utf8mb4'SAIDA') and (`sale_id` is not null) and (`sale_item_id` is not null)) or ((`origem` = _utf8mb4'CANCELAMENTO_VENDA') and (`natureza` = _utf8mb4'ENTRADA') and (`sale_id` is not null) and (`movimento_original_id` is not null)) or (`origem` in (_utf8mb4'AJUSTE',_utf8mb4'ENTRADA_INICIAL')))),
  CONSTRAINT `chk_stock_movements_quantidade` CHECK ((`quantidade` > 0.0000)),
  CONSTRAINT `chk_stock_movements_saldo` CHECK ((((`natureza` = _utf8mb4'SAIDA') and (`estoque_antes` >= `quantidade`) and (`estoque_depois` = (`estoque_antes` - `quantidade`))) or ((`natureza` = _utf8mb4'ENTRADA') and (`estoque_depois` = (`estoque_antes` + `quantidade`)))))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
INSERT INTO `stock_movements` VALUES (1,1,NULL,NULL,NULL,'ENTRADA','ENTRADA_INICIAL',10.0000,0.0000,10.0000,'Carga inicial de estoque existente','CARGA-INICIAL-ESTOQUE-PRODUTO-1',1,'2026-07-03 14:07:43.813726'),(2,1,1,1,NULL,'SAIDA','VENDA',1.0000,10.0000,9.0000,'Venda #1','sale-stock-1-1',1,'2026-07-03 14:29:03.717736'),(3,1,2,2,NULL,'SAIDA','VENDA',1.0000,9.0000,8.0000,'Venda #2','sale-stock-2-2',1,'2026-07-03 14:34:55.066202'),(4,1,3,6,NULL,'SAIDA','VENDA',1.0000,8.0000,7.0000,'Venda #3','sale-stock-3-6',1,'2026-07-03 14:36:02.183565'),(5,1,3,6,4,'ENTRADA','CANCELAMENTO_VENDA',1.0000,7.0000,8.0000,'nao é em debito','cancel-stock-3-4',1,'2026-07-03 14:36:21.726178'),(6,1,4,8,NULL,'SAIDA','VENDA',1.0000,8.0000,7.0000,'Venda #4','sale-stock-4-8',1,'2026-07-03 14:37:09.342817'),(7,2,5,10,NULL,'SAIDA','VENDA',1.0000,20.0000,19.0000,'Venda #5','sale-stock-5-10',1,'2026-07-03 18:50:38.429141'),(8,1,5,11,NULL,'SAIDA','VENDA',1.0000,7.0000,6.0000,'Venda #5','sale-stock-5-11',1,'2026-07-03 18:50:38.431327'),(9,1,6,12,NULL,'SAIDA','VENDA',1.0000,6.0000,5.0000,'Venda #6','sale-stock-6-12',1,'2026-07-03 18:52:03.931903');
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `locked_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role_id` (`role_id`),
  CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrador','administrador@cantina.com.br','$2b$12$/uUT7yScLE2QDsH0.84X2eoQz1X49SKsam6csoiuTzxCFzN3GYXWK',1,1,'2026-07-03 13:28:39',NULL,'2026-07-03 11:50:50','2026-07-03 13:28:39');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-03 19:11:26
