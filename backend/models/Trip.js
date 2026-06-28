// const mongoose = require('mongoose');

// const tripSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   destination: {
//     type: String,
//     required: true
//   },
//   days: {
//     type: Number,
//     required: true
//   },
//   budget: {
//     type: Number,
//     required: true
//   },
//   // people field - number of travelers for this trip
//   people: {
//     type: Number,
//     required: true
//   },
//   hotels: {
//     type: Array,
//     default: []
//   },
//   restaurants: {
//     type: Array,
//     default: []
//   },
//   itinerary: {
//     type: String,
//     default: ''
//   }
// }, { timestamps: true });

// module.exports = mongoose.model('Trip', tripSchema);

const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  destination: { type: String, required: true },
  days:        { type: Number, required: true },
  budget:      { type: Number, required: true },
  people:      { type: Number, required: true },
  hotels:      { type: Array, default: [] },
  restaurants: { type: Array, default: [] },
  itinerary:   { type: String, default: '' },

  // NEW: stores the computed budget breakdown so saved trips retain it
  budgetBreakdown: {
    total:          Number,
    hotel:          { allocated: Number, estimated: Number, perNight: Number },
    food:           { allocated: Number, estimated: Number, perMealPerPerson: Number },
    activities:     { allocated: Number },
    estimatedTotal: Number,
    remaining:      Number,
    status:         String   // 'within_budget' or 'over_budget'
  }

}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);