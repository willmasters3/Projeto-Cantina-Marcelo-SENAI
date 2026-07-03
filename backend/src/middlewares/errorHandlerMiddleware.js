const errorHandlerMiddleware = (err, req, res, _next) => {
  const statusCode = err.status || 500;
  const message = statusCode >= 500 ? 'Erro interno do servidor' : err.message;

  if (statusCode >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]\n${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: message
  });
};

export default errorHandlerMiddleware;
