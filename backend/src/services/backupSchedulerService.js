import backupService from './backupService.js';

let schedulerTimer = null;
let schedulerRunning = false;

const runSchedulerTick = async () => {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    await backupService.runDueAutomaticBackup();
  } catch (error) {
    console.error(`[backup-scheduler] ${error.stack || error.message}`);
  } finally {
    schedulerRunning = false;
  }
};

const start = () => {
  if (schedulerTimer) return;
  schedulerTimer = setInterval(runSchedulerTick, 60 * 1000);
  schedulerTimer.unref?.();
  void runSchedulerTick();
};

const stop = () => {
  if (!schedulerTimer) return;
  clearInterval(schedulerTimer);
  schedulerTimer = null;
};

export default { start, stop };
