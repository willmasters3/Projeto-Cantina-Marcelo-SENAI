import HttpError from '../utils/httpError.js';

const requestBuckets = new Map();
const windowMilliseconds = 60_000;
const maximumRequests = 10;

const monitorAccountRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || 'monitor';
  const current = requestBuckets.get(key);
  const bucket = !current || current.expiresAt <= now
    ? { count: 0, expiresAt: now + windowMilliseconds }
    : current;

  if (bucket.count >= maximumRequests) {
    res.setHeader('Retry-After', String(Math.ceil((bucket.expiresAt - now) / 1000)));
    return next(new HttpError(429, 'Muitas consultas. Aguarde um momento e tente novamente.'));
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  if (requestBuckets.size > 1000) {
    requestBuckets.forEach((value, bucketKey) => {
      if (value.expiresAt <= now) requestBuckets.delete(bucketKey);
    });
  }
  return next();
};

export default monitorAccountRateLimit;
