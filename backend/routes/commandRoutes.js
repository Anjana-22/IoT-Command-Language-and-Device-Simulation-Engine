const express = require('express');
const { analyzeProgram } = require('../compiler');
const { evaluate } = require('../compiler/executionEngine');
const store = require('../persistence');

const router = express.Router();
router.post('/analyze', async (req, res, next) => {
  try {
    const results = analyzeProgram(req.body?.command);
    if (!results.length) return res.status(400).json({ error: 'Enter at least one command.' });
    await Promise.all(results.map((result) => store.saveCommand({
      command: result.command, tokens: result.tokens, parseResult: result.parseResult,
      semanticResult: result.semanticResult, intermediateRepresentation: result.intermediateRepresentation,
      executionResult: result.error ? { status: `${result.error.stage} Error`, message: result.error.message } : undefined
    })));
    res.json({ results, storage: store.connected() ? 'mongodb' : 'memory' });
  } catch (error) { next(error); }
});

router.post('/execute', async (req, res, next) => {
  try {
    const results = analyzeProgram(req.body?.command);
    if (!results.length) return res.status(400).json({ error: 'Enter at least one command.' });
    const sensors = await store.getSensors();
    const executions = [];
    for (const result of results) {
      let executionResult;
      if (result.success) {
        executionResult = evaluate(result.intermediateRepresentation, sensors);
        if (executionResult.conditionMet) await store.setDevice(executionResult.device, result.intermediateRepresentation.action);
      } else {
        executionResult = { condition: null, sensorValue: null, conditionMet: null, action: 'Not executed', device: result.ast?.device || null, status: `${result.error.stage} Error`, message: result.error.message };
      }
      result.executionResult = executionResult;
      const record = {
        command: result.command, condition: executionResult.condition,
        sensorValue: executionResult.sensorValue, conditionMet: executionResult.conditionMet,
        action: executionResult.action, device: executionResult.device, status: executionResult.status
      };
      await store.saveCommand({
        command: result.command, tokens: result.tokens, parseResult: result.parseResult,
        semanticResult: result.semanticResult, intermediateRepresentation: result.intermediateRepresentation,
        executionResult
      });
      executions.push(await store.saveHistory(record));
    }
    res.json({ results, executions, sensors, devices: await store.getDevices(), storage: store.connected() ? 'mongodb' : 'memory' });
  } catch (error) { next(error); }
});

router.get('/history', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    res.json({ history: await store.getHistory(limit), storage: store.connected() ? 'mongodb' : 'memory' });
  } catch (error) { next(error); }
});

module.exports = router;
