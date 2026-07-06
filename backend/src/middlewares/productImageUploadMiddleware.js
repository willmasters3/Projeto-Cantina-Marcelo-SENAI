import express from 'express';
import path from 'path';
import productImagesConfig from '../config/productImages.js';
import HttpError from '../utils/httpError.js';

const allowedExtensionsByMime = new Map([
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])]
]);

const rawImageParser = express.raw({
  type: () => true,
  limit: productImagesConfig.maxSizeBytes
});

const detectImageMime = (buffer) => {
  if (!Buffer.isBuffer(buffer)) return null;

  if (
    buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff
  ) return 'image/jpeg';

  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'image/png';

  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';

  return null;
};

const decodeOriginalFileName = (headerValue) => {
  if (!headerValue || Array.isArray(headerValue)) {
    throw new HttpError(422, 'Informe o nome original do arquivo de imagem.');
  }

  try {
    return decodeURIComponent(headerValue);
  } catch {
    throw new HttpError(422, 'Nome original do arquivo de imagem inválido.');
  }
};

const validateImageHeaders = (req) => {
  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new HttpError(415, 'Imagens compactadas no transporte não são aceitas.');
  }

  const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const allowedExtensions = allowedExtensionsByMime.get(mimeType);
  if (!allowedExtensions) {
    throw new HttpError(415, 'Envie uma imagem JPEG, PNG ou WebP.');
  }

  const originalName = decodeOriginalFileName(req.headers['x-file-name']);
  if (
    originalName !== path.basename(originalName)
    || originalName.includes('/')
    || originalName.includes('\\')
  ) {
    throw new HttpError(422, 'Nome do arquivo de imagem inválido.');
  }

  const extension = path.extname(originalName).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new HttpError(415, 'A extensão do arquivo não corresponde ao formato da imagem.');
  }

  return { extension, mimeType, originalName };
};

const productImageUploadMiddleware = (req, res, next) => {
  let uploadMetadata;
  try {
    uploadMetadata = validateImageHeaders(req);
  } catch (error) {
    next(error);
    return;
  }

  rawImageParser(req, res, (parseError) => {
    if (parseError) {
      if (parseError.type === 'entity.too.large') {
        next(new HttpError(413, 'A imagem deve ter no máximo 5 MB.'));
        return;
      }
      next(new HttpError(400, 'Não foi possível ler o arquivo de imagem.'));
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      next(new HttpError(422, 'Selecione um arquivo de imagem válido.'));
      return;
    }

    const detectedMimeType = detectImageMime(req.body);
    if (!detectedMimeType || detectedMimeType !== uploadMetadata.mimeType) {
      next(new HttpError(415, 'O conteúdo do arquivo não corresponde a uma imagem válida.'));
      return;
    }

    req.productImageUpload = {
      ...uploadMetadata,
      buffer: req.body,
      size: req.body.length
    };
    next();
  });
};

export { detectImageMime, validateImageHeaders };
export default productImageUploadMiddleware;
