const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  deviceName: { type: String, unique: true, required: true },
  state: { type: String, enum: ['ON', 'OFF'], default: 'OFF' },
  updatedAt: { type: Date, default: Date.now }
}, { versionKey: false });

module.exports = mongoose.models.Device || mongoose.model('Device', DeviceSchema);
