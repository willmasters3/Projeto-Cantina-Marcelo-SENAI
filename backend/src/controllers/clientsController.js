import clientsService from '../services/clientsService.js';

const listClients = async (req, res, next) => {
  try {
    const clients = await clientsService.listClients({ search: req.query.search });
    res.status(200).json({ data: clients });
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const client = await clientsService.getClientById(req.params.id);
    res.status(200).json({ data: client });
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  try {
    const client = await clientsService.createClient(req.body);
    res.status(201).json({ data: client });
  } catch (error) {
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const client = await clientsService.updateClient(req.params.id, req.body);
    res.status(200).json({ data: client });
  } catch (error) {
    next(error);
  }
};

const updateClientStatus = async (req, res, next) => {
  try {
    const client = await clientsService.updateClientStatus(req.params.id, req.body.ativo);
    res.status(200).json({ data: client });
  } catch (error) {
    next(error);
  }
};

export default {
  listClients,
  getClientById,
  createClient,
  updateClient,
  updateClientStatus
};
