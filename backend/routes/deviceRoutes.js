const express = require('express');
const store = require('../persistence');
const router = express.Router();
router.get('/', async (_req, res, next) => {
  try { res.json({ devices: await store.getDevices(), storage: store.connected() ? 'mongodb' : 'memory' }); }
  catch (error) { next(error); }
});
module.exports = router;
