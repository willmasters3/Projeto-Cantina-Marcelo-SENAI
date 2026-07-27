const errorHandlerMiddleware = (err, req, res, _next) => {
  const statusCode = err.status || 500;
  const message = statusCode >= 500 ? 'Erro interno do servidor' : err.message;

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]\n${err.stack || err.message}`);
  }

  const payload = {
    success: false,
    error: message
  };

  if (statusCode < 500 && err.code) {
    payload.code = err.code;
  }

  if (statusCode < 500 && err.details) {
    payload.details = err.details;
  }

  res.status(statusCode).json(payload);
};

export default errorHandlerMiddleware;
