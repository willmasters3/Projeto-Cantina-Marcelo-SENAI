const errorHandlerMiddleware = (err, req, res, _next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err.message);

  const statusCode = err.status || 500;
  const message = statusCode === 500 ? 'Erro interno do servidor' : err.message;

  res.status(statusCode).json({
    success: false,
    error: message
  });
};

export default errorHandlerMiddleware;
