import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backupConfig = {
  maxUploadSizeBytes: 200 * 1024 * 1024,
  storageDirectory: path.resolve(__dirname, '../../storage/backups')
};

export default backupConfig;
