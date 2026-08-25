import settingsService from '../services/settingsService.js';
import HttpError from '../utils/httpError.js';

const serveScreensaverImage = async (req, res, next) => {
  try {
    const image = await settingsService.getPublicMonitorImage(req.params.filename);
    res.type(image.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(
      image.filename,
      { root: image.storageDirectory, dotfiles: 'deny' },
      (error) => {
        if (!error) return;
        if (res.headersSent) {
          next(error);
          return;
        }
        next(new HttpError(404, 'Imagem não encontrada'));
      }
    );
  } catch (error) {
    next(error);
  }
};

export default { serveScreensaverImage };
