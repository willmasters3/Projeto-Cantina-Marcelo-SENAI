import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productImagesConfig = {
  maxSizeBytes: 5 * 1024 * 1024,
  publicPrefix: '/media/products/',
  storageDirectory: path.resolve(__dirname, '../../storage/products')
};

export default productImagesConfig;
