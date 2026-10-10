const express = require('express');
const store = require('../persistence');
const router = express.Router();
const LIMITS = { temperature: [-50, 100], light: [0, 100], humidity: [0, 100] };

router.get('/', async (_req, res, next) => {
  try { res.json({ sensors: await store.getSensors(), storage: store.connected() ? 'mongodb' : 'memory' }); }
  catch (error) { next(error); }
});
router.put('/', async (req, res, next) => {
  try {
    const values = {};
    for (const [key, [min, max]] of Object.entries(LIMITS)) {
      if (req.body?.[key] === undefined) continue;
      const value = Number(req.body[key]);
      if (!Number.isFinite(value) || value < min || value > max) return res.status(400).json({ error: `${key} must be a number between ${min} and ${max}.` });
      values[key] = value;
    }
    if (!Object.keys(values).length) return res.status(400).json({ error: 'Provide at least one sensor value.' });
    res.json({ sensors: await store.setSensors(values), storage: store.connected() ? 'mongodb' : 'memory' });
  } catch (error) { next(error); }
});
module.exports = router;
