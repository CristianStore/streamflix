const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_config'
  },
  featuredHeroId: {
    type: Number,
    default: 1
  },
  featuredHeroTitle: {
    type: String,
    default: 'Sintel'
  },
  featuredHeroBannerUrl: {
    type: String,
    default: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80'
  },
  minAppVersion: {
    type: String,
    default: '1.0.0'
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.AppConfig || mongoose.model('AppConfig', appConfigSchema);
