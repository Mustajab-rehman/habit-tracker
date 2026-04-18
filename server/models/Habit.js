// server/models/Habit.js
const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,        // Removes whitespace from both ends
  },
  description: {
    type: String,
    default: '',        // Optional field
  },
  createdAt: {
    type: Date,
    default: Date.now,  // Automatically sets to current date/time
  },
  completedDates: [{
    type: Date,
  }],
});

module.exports = mongoose.model('Habit', habitSchema);