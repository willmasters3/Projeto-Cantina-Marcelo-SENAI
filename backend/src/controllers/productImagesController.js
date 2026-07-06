import productImagesConfig from '../config/productImages.js';
import productImagesService from '../services/productImagesService.js';
import HttpError from '../utils/httpError.js';

const uploadPrimaryImage = async (req, res, next) => {
  try {
    const image = await productImagesService.uploadPrimaryImage(
      req.params.id,
      req.productImageUpload
    );
    res.status(201).json({ data: image });
  } catch (error) {
    next(error);
  }
};

const removePrimaryImage = async (req, res, next) => {
  try {
    const result = await productImagesService.removePrimaryImage(req.params.id);
    res.status(200).json({ data: result });
  } catch (error) {
    next(error);
  }
};

const serveImage = async (req, res, next) => {
  try {
    const image = await productImagesService.getPublicImage(req.params.filename);
    res.type(image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(
      image.filename,
      { root: productImagesConfig.storageDirectory, dotfiles: 'deny' },
      (error) => {
        if (!error) return;
        if (res.headersSent) {
          next(error);
          return;
        }
        next(new HttpError(404, 'Imagem não encontrada.'));
      }
    );
  } catch (error) {
    next(error);
  }
};

export default { removePrimaryImage, serveImage, uploadPrimaryImage };
