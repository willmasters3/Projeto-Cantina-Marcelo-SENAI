import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const monitorAssetsConfig = {
  maxImageSizeBytes: 5 * 1024 * 1024,
  publicPrefix: '/media/monitor/',
  storageDirectory: path.resolve(__dirname, '../../storage/monitor')
};

export default monitorAssetsConfig;
