const errorHandlerMiddleware = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.status || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: message
  });
};

export default errorHandlerMiddleware;
