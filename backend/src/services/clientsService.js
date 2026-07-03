import clientsRepository from '../repositories/clientsRepository.js';
import HttpError from '../utils/httpError.js';

const maxCodeGenerationAttempts = 5;

const normalizeOptionalText = (value) => {
  if (typeof value !== 'string') return null;
  return value.trim() || null;
};

const normalizeClient = (payload) => ({
  nome: payload.nome.trim(),
  matricula: normalizeOptionalText(payload.matricula),
  telefone: normalizeOptionalText(payload.telefone),
  email: normalizeOptionalText(payload.email)?.toLowerCase() || null,
  observacoes: normalizeOptionalText(payload.observacoes)
});

const formatClientCode = (number) => `CLI-${String(number).padStart(6, '0')}`;

const ensureMatriculaAvailable = async (matricula, excludingId = null) => {
  if (!matricula) return;

  const existing = excludingId === null
    ? await clientsRepository.findByMatricula(matricula)
    : await clientsRepository.findByMatriculaExcludingId(matricula, excludingId);

  if (existing) {
    throw new HttpError(
      409,
      `A matrícula ${existing.matricula} já está cadastrada para ${existing.nome}.`
    );
  }
};

const listClients = async ({ search }) => clientsRepository.findAll({ search: search || '' });

const getClientById = async (id) => {
  const client = await clientsRepository.findById(id);
  if (!client) throw new HttpError(404, 'Cliente não encontrado');
  return client;
};

const createClient = async (payload) => {
  const clientData = normalizeClient(payload);
  await ensureMatriculaAvailable(clientData.matricula);

  for (let attempt = 0; attempt < maxCodeGenerationAttempts; attempt += 1) {
    const nextCodeNumber = await clientsRepository.getNextCodeNumber();
    const clientWithCode = {
      ...clientData,
      codigo: formatClientCode(nextCodeNumber),
      ativo: true
    };

    try {
      const clientId = await clientsRepository.createClient(clientWithCode);
      return clientsRepository.findById(clientId);
    } catch (error) {
      if (error.code !== 'ER_DUP_ENTRY') throw error;

      if (clientData.matricula) {
        const duplicatedMatricula = await clientsRepository.findByMatricula(clientData.matricula);
        if (duplicatedMatricula) {
          throw new HttpError(
            409,
            `A matrícula ${duplicatedMatricula.matricula} já está cadastrada para ${duplicatedMatricula.nome}.`
          );
        }
      }
    }
  }

  throw new HttpError(409, 'Não foi possível gerar um código interno único. Tente novamente.');
};

const updateClient = async (id, payload) => {
  await getClientById(id);
  const clientData = normalizeClient(payload);
  await ensureMatriculaAvailable(clientData.matricula, id);

  try {
    await clientsRepository.updateClient(id, clientData);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new HttpError(409, 'A matrícula informada já pertence a outro cliente.');
    }
    throw error;
  }

  return clientsRepository.findById(id);
};

const updateClientStatus = async (id, ativo) => {
  await getClientById(id);
  await clientsRepository.updateStatus(id, ativo);
  return clientsRepository.findById(id);
};

export default {
  listClients,
  getClientById,
  createClient,
  updateClient,
  updateClientStatus
};

export { formatClientCode };
