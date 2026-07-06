-- Projeto Cantina
-- Corrige o cálculo da diferença de fechamento quando o valor informado
-- é menor que o valor esperado.
--
-- As colunas de valores permanecem DECIMAL UNSIGNED, pois não aceitam valores
-- negativos individualmente. Somente o resultado da subtração é assinado.

ALTER TABLE cash_sessions
  MODIFY COLUMN diferenca_fechamento DECIMAL(15,4)
  GENERATED ALWAYS AS (
    CASE
      WHEN valor_fechamento_esperado IS NOT NULL
       AND valor_fechamento_informado IS NOT NULL
      THEN CAST(valor_fechamento_informado AS DECIMAL(15,4))
         - CAST(valor_fechamento_esperado AS DECIMAL(15,4))
      ELSE NULL
    END
  ) STORED;

-- Conferência opcional após executar o ALTER TABLE:
-- SHOW CREATE TABLE cash_sessions;
