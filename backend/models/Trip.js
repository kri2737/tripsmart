const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  days: {
    type: Number,
    required: true
  },
  budget: {
    type: Number,
    required: true
  },
  hotels: {
    type: Array,
    default: []
  },
  restaurants: {
    type: Array,
    default: []
  },
  itinerary: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);