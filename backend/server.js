require('dotenv').config();
const path = require('path');
const express = require('express');
const store = require('./persistence');

const port = Number(process.env.PORT) || 3000;

function createApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
  app.use('/api', require('./routes/commandRoutes'));
  app.use('/api/sensors', require('./routes/sensorRoutes'));
  app.use('/api/devices', require('./routes/deviceRoutes'));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', storage: store.connected() ? 'mongodb' : 'memory' }));
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Server error. Check the backend console for details.' });
  });
  return app;
}

if (require.main === module) {
  store.connectMongo(process.env.MONGODB_URI).then((connected) => {
    if (!connected) console.log('Starting with in-memory storage. Set MONGODB_URI to enable persistence.');
    createApp().listen(port, () => console.log(`IoT Command Engine ready at http://localhost:${port}`));
  });
}

module.exports = { createApp };
