import statusService from '../services/statusService.js';

const getStatus = async (req, res, next) => {
  try {
    const status = await statusService.getSystemStatus();
    return res.status(200).json(status);
  } catch (error) {
    return next(error);
  }
};

export default { getStatus };
