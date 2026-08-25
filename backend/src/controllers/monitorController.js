import monitorAccountService from '../services/monitorAccountService.js';
import monitorStateService from '../services/monitorStateService.js';
import settingsService from '../services/settingsService.js';

const getSettings = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ data: await settingsService.getPublicMonitorSettings() });
  } catch (error) {
    next(error);
  }
};

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

const pairMonitor = (req, res, next) => {
  try {
    const pairing = monitorStateService.confirmPairing(req.body?.token, {
      force: Boolean(req.body?.force)
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ data: pairing });
  } catch (error) {
    next(error);
  }
};

const streamState = (req, res, next) => {
  let terminal;
  let pairingToken;
  let connectionId;
  let closed = false;

  const disconnect = (reason) => {
    if (closed || res.destroyed) return;
    closed = true;
    res.write(`event: monitor-disconnected\ndata: ${JSON.stringify({ reason })}\n\n`);
    res.end();
  };

  try {
    const pairing = monitorStateService.registerMonitorConnection(req.query.token, disconnect);
    terminal = pairing.terminal;
    pairingToken = pairing.token;
    connectionId = pairing.connectionId;
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
    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
    monitorStateService.unregisterMonitorConnection(terminal, pairingToken, connectionId);
  });
};

export default { getAccount, getSettings, pairMonitor, streamState, updateState };
