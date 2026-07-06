import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import productImagesConfig from '../config/productImages.js';
import productImagesRepository from '../repositories/productImagesRepository.js';
import HttpError from '../utils/httpError.js';

const extensionByMime = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp']
]);

const generatedFilenamePattern = /^product-[1-9]\d*-[a-f0-9]{6}\.(?:jpg|png|webp)$/;

const getSafeStoragePath = (filename) => {
  if (!generatedFilenamePattern.test(filename)) {
    throw new HttpError(400, 'Nome de arquivo de imagem inválido.');
  }
  const resolvedPath = path.resolve(productImagesConfig.storageDirectory, filename);
  if (path.dirname(resolvedPath) !== productImagesConfig.storageDirectory) {
    throw new HttpError(400, 'Caminho de imagem inválido.');
  }
  return resolvedPath;
};

const removeStoredFile = async (filename) => {
  if (!filename || !generatedFilenamePattern.test(filename)) return;
  try {
    await fs.unlink(getSafeStoragePath(filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(`[product-images] Falha ao remover ${filename}: ${error.stack || error.message}`);
    }
  }
};

const storeNewFile = async (productId, upload) => {
  const extension = extensionByMime.get(upload.mimeType);
  if (!extension) throw new HttpError(415, 'Formato de imagem não permitido.');

  await fs.mkdir(productImagesConfig.storageDirectory, { recursive: true });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const identifier = crypto.randomBytes(3).toString('hex');
    const filename = `product-${productId}-${identifier}${extension}`;
    try {
      await fs.writeFile(getSafeStoragePath(filename), upload.buffer, { flag: 'wx' });
      return filename;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }
  throw new HttpError(500, 'Não foi possível gerar um nome seguro para a imagem.');
};

const uploadPrimaryImage = async (productId, upload) => {
  if (!/^[1-9]\d*$/.test(String(productId))) {
    throw new HttpError(400, 'Produto inválido.');
  }

  const filename = await storeNewFile(productId, upload);
  const imageData = {
    filename,
    publicPath: `${productImagesConfig.publicPrefix}${filename}`,
    mimeType: upload.mimeType,
    size: upload.size
  };

  let result;
  try {
    result = await productImagesRepository.replacePrimaryImage(productId, imageData);
  } catch (error) {
    await removeStoredFile(filename);
    throw error;
  }

  if (!result.productFound) {
    await removeStoredFile(filename);
    throw new HttpError(404, 'Produto não encontrado.');
  }

  await removeStoredFile(result.previousImage?.nome_arquivo);
  return {
    ...result.image,
    imagem_url: result.image.caminho_publico
  };
};

const removePrimaryImage = async (productId) => {
  if (!/^[1-9]\d*$/.test(String(productId))) {
    throw new HttpError(400, 'Produto inválido.');
  }
  const result = await productImagesRepository.removePrimaryImage(productId);
  if (!result.productFound) throw new HttpError(404, 'Produto não encontrado.');
  if (!result.image) throw new HttpError(404, 'O produto não possui imagem para remover.');

  await removeStoredFile(result.image.nome_arquivo);
  return { removida: true };
};

const getPublicImage = async (filename) => {
  if (!generatedFilenamePattern.test(filename)) {
    throw new HttpError(404, 'Imagem não encontrada.');
  }
  const image = await productImagesRepository.findActiveByFilename(filename);
  if (!image) throw new HttpError(404, 'Imagem não encontrada.');
  return {
    filename: image.nome_arquivo,
    mimeType: image.mime_type
  };
};

export { generatedFilenamePattern, getSafeStoragePath };
export default {
  getPublicImage,
  removePrimaryImage,
  uploadPrimaryImage
};
