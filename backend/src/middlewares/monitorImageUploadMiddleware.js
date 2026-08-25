import express from 'express';
import path from 'node:path';
import monitorAssetsConfig from '../config/monitorAssets.js';
import { detectImageMime } from './productImageUploadMiddleware.js';
import HttpError from '../utils/httpError.js';

const allowedExtensionsByMime = new Map([
  ['image/jpeg', new Set(['.jpg', '.jpeg'])],
  ['image/png', new Set(['.png'])],
  ['image/webp', new Set(['.webp'])]
]);

const rawImageParser = express.raw({
  type: () => true,
  limit: monitorAssetsConfig.maxImageSizeBytes
});

const decodeOriginalFileName = (headerValue) => {
  if (!headerValue || Array.isArray(headerValue)) {
    throw new HttpError(422, 'Informe o nome original da imagem.');
  }

  try {
    return decodeURIComponent(headerValue);
  } catch {
    throw new HttpError(422, 'Nome original da imagem inválido.');
  }
};

const validateHeaders = (req) => {
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

const monitorImageUploadMiddleware = (req, res, next) => {
  let uploadMetadata;
  try {
    uploadMetadata = validateHeaders(req);
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
      next(new HttpError(422, 'Selecione uma imagem válida.'));
      return;
    }

    const detectedMimeType = detectImageMime(req.body);
    if (!detectedMimeType || detectedMimeType !== uploadMetadata.mimeType) {
      next(new HttpError(415, 'O conteúdo do arquivo não corresponde a uma imagem válida.'));
      return;
    }

    req.monitorImageUpload = {
      ...uploadMetadata,
      buffer: req.body,
      size: req.body.length
    };
    next();
  });
};

export default monitorImageUploadMiddleware;
