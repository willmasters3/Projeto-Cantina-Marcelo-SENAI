const notFoundMiddleware = (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl
  });
};

export default notFoundMiddleware;
