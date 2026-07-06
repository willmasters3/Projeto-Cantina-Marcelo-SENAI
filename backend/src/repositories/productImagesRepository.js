import { pool } from '../config/database.js';

const findActiveByFilename = async (filename) => {
  const [rows] = await pool.query(
    `SELECT id, produto_id, nome_arquivo, caminho_publico, mime_type, tamanho_bytes
     FROM product_images
     WHERE nome_arquivo = ?
       AND imagem_principal = 1
       AND removida_em IS NULL
     LIMIT 1`,
    [filename]
  );
  return rows[0] || null;
};

const replacePrimaryImage = async (productId, image) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.query(
      'SELECT id FROM products WHERE id = ? LIMIT 1 FOR UPDATE',
      [productId]
    );
    if (!products.length) {
      await connection.rollback();
      return { productFound: false };
    }

    const [currentImages] = await connection.query(
      `SELECT id, nome_arquivo, caminho_publico
       FROM product_images
       WHERE produto_id = ?
         AND imagem_principal = 1
         AND removida_em IS NULL
       LIMIT 1
       FOR UPDATE`,
      [productId]
    );

    if (currentImages.length) {
      await connection.query(
        `UPDATE product_images
         SET imagem_principal = 0,
             removida_em = CURRENT_TIMESTAMP,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [currentImages[0].id]
      );
    }

    const [result] = await connection.query(
      `INSERT INTO product_images
        (produto_id, nome_arquivo, caminho_publico, mime_type, tamanho_bytes, imagem_principal)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [
        productId,
        image.filename,
        image.publicPath,
        image.mimeType,
        image.size
      ]
    );
    await connection.commit();
    return {
      productFound: true,
      previousImage: currentImages[0] || null,
      image: {
        id: result.insertId,
        produto_id: Number(productId),
        nome_arquivo: image.filename,
        caminho_publico: image.publicPath,
        mime_type: image.mimeType,
        tamanho_bytes: image.size,
        imagem_principal: 1
      }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const removePrimaryImage = async (productId) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [products] = await connection.query(
      'SELECT id FROM products WHERE id = ? LIMIT 1 FOR UPDATE',
      [productId]
    );
    if (!products.length) {
      await connection.rollback();
      return { productFound: false };
    }

    const [images] = await connection.query(
      `SELECT id, nome_arquivo, caminho_publico
       FROM product_images
       WHERE produto_id = ?
         AND imagem_principal = 1
         AND removida_em IS NULL
       LIMIT 1
       FOR UPDATE`,
      [productId]
    );
    if (!images.length) {
      await connection.commit();
      return { productFound: true, image: null };
    }

    await connection.query(
      `UPDATE product_images
       SET imagem_principal = 0,
           removida_em = CURRENT_TIMESTAMP,
           atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [images[0].id]
    );
    await connection.commit();
    return { productFound: true, image: images[0] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export default {
  findActiveByFilename,
  removePrimaryImage,
  replacePrimaryImage
};
