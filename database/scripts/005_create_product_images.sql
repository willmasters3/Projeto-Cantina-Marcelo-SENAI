-- Projeto Cantina
-- Migration 005: metadados das imagens de produtos
--
-- Este script cria somente a tabela product_images.
-- Os arquivos de imagem permanecem no armazenamento físico da aplicação;
-- o banco guarda apenas metadados e o caminho público iniciado por /media/products/.

USE `projeto_cantina`;

CREATE TABLE `product_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `produto_id` BIGINT UNSIGNED NOT NULL,
  `nome_arquivo` VARCHAR(255) NOT NULL,
  `caminho_publico` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `tamanho_bytes` BIGINT UNSIGNED NOT NULL,
  `imagem_principal` TINYINT(1) NOT NULL DEFAULT 0,
  `removida_em` DATETIME NULL DEFAULT NULL,
  `criado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  -- Para uma imagem principal ativa, esta coluna recebe produto_id.
  -- Para imagens secundárias ou removidas, recebe NULL. Como índices UNIQUE
  -- aceitam vários NULLs, o banco permite o histórico e impede duas imagens
  -- principais ativas para o mesmo produto.
  `produto_principal_ativo_id` BIGINT UNSIGNED
    GENERATED ALWAYS AS (
      CASE
        WHEN `imagem_principal` = 1 AND `removida_em` IS NULL
          THEN `produto_id`
        ELSE NULL
      END
    ) STORED,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_images_nome_arquivo` (`nome_arquivo`),
  UNIQUE KEY `uq_product_images_caminho_publico` (`caminho_publico`),
  UNIQUE KEY `uq_product_images_principal_ativa` (`produto_principal_ativo_id`),
  KEY `idx_product_images_produto_historico`
    (`produto_id`, `removida_em`, `criado_em`),

  CONSTRAINT `fk_product_images_produto`
    FOREIGN KEY (`produto_id`)
    REFERENCES `products` (`id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,

  CONSTRAINT `chk_product_images_principal`
    CHECK (`imagem_principal` IN (0, 1)),

  CONSTRAINT `chk_product_images_mime_type`
    CHECK (`mime_type` IN ('image/jpeg', 'image/png', 'image/webp')),

  CONSTRAINT `chk_product_images_tamanho`
    CHECK (`tamanho_bytes` > 0 AND `tamanho_bytes` <= 5242880),

  CONSTRAINT `chk_product_images_nome_arquivo`
    CHECK (
      CHAR_LENGTH(TRIM(`nome_arquivo`)) > 0
      AND LOCATE('/', `nome_arquivo`) = 0
      AND LOCATE(CHAR(92), `nome_arquivo`) = 0
    ),

  CONSTRAINT `chk_product_images_caminho_publico`
    CHECK (
      `caminho_publico` LIKE '/media/products/%'
      AND `caminho_publico` NOT LIKE '%..%'
      AND LOCATE(CHAR(92), `caminho_publico`) = 0
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
