import monitorAccountService from '../services/monitorAccountService.js';
import monitorStateService from '../services/monitorStateService.js';

const getAccount = async (req, res, next) => {
  try {
    const account = await monitorAccountService.getPublicAccount(req.body.cpf);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ data: account });
  } catch (error) {
    next(error);
  }
};

const updateState = (req, res, next) => {
  try {
    const state = monitorStateService.publishState(req.body);
    res.status(200).json({ data: state });
  } catch (error) {
    next(error);
  }
};

const streamState = (req, res, next) => {
  let terminal;
  try {
    terminal = monitorStateService.normalizeTerminal(req.query.terminal);
  } catch (error) {
    next(error);
    return;
  }

  res.status(200);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  res.write('retry: 2000\n\n');

  const sendState = (state) => {
    res.write(`event: monitor-state\ndata: ${JSON.stringify(state)}\n\n`);
  };
  const unsubscribe = monitorStateService.subscribe(terminal, sendState);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);
  heartbeat.unref?.();

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};

export default { getAccount, streamState, updateState };
