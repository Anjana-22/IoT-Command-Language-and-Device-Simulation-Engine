const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  temperature: { type: Number, default: 24 },
  light: { type: Number, default: 55 },
  humidity: { type: Number, default: 45 },
  timestamp: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.models.Sensor || mongoose.model('Sensor', SensorSchema);
