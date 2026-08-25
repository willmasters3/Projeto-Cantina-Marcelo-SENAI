import express from 'express';
import path from 'node:path';
import backupConfig from '../config/backup.js';
import HttpError from '../utils/httpError.js';

const rawSqlParser = express.raw({
  type: () => true,
  limit: backupConfig.maxUploadSizeBytes
});

const decodeOriginalFileName = (headerValue) => {
  if (!headerValue || Array.isArray(headerValue)) {
    throw new HttpError(422, 'Informe o nome original do arquivo de backup.');
  }

  try {
    return decodeURIComponent(headerValue);
  } catch {
    throw new HttpError(422, 'Nome original do backup inválido.');
  }
};

const validateHeaders = (req) => {
  const originalName = decodeOriginalFileName(req.headers['x-file-name']);
  if (
    originalName !== path.basename(originalName)
    || originalName.includes('/')
    || originalName.includes('\\')
  ) {
    throw new HttpError(422, 'Nome do arquivo de backup inválido.');
  }

  if (path.extname(originalName).toLowerCase() !== '.sql') {
    throw new HttpError(415, 'Envie um arquivo SQL compatível.');
  }

  if (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity') {
    throw new HttpError(415, 'Arquivos compactados no transporte não são aceitos.');
  }

  return { originalName };
};

const backupUploadMiddleware = (req, res, next) => {
  let uploadMetadata;
  try {
    uploadMetadata = validateHeaders(req);
  } catch (error) {
    next(error);
    return;
  }

  rawSqlParser(req, res, (parseError) => {
    if (parseError) {
      if (parseError.type === 'entity.too.large') {
        next(new HttpError(413, 'O backup deve ter no máximo 200 MB.'));
        return;
      }
      next(new HttpError(400, 'Não foi possível ler o arquivo de backup.'));
      return;
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      next(new HttpError(422, 'Selecione um arquivo SQL válido.'));
      return;
    }

    req.backupUpload = {
      ...uploadMetadata,
      buffer: req.body,
      size: req.body.length
    };
    next();
  });
};

export default backupUploadMiddleware;
