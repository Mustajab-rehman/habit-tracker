require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import routes and middleware
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Import Habit model
const Habit = require('./models/Habit');

// Helper function to calculate streak (unchanged)
const calculateStreak = (completedDates) => {
  if (!completedDates || completedDates.length === 0) return 0;
  const sortedDates = completedDates
    .map(date => new Date(date).setUTCHours(0, 0, 0, 0))
    .sort((a, b) => b - a);
  const today = new Date().setUTCHours(0, 0, 0, 0);
  let streak = 0;
  let currentDate = today;
  for (let date of sortedDates) {
    if (date === currentDate) {
      streak++;
      currentDate -= 24 * 60 * 60 * 1000;
    } else {
      break;
    }
  }
  return streak;
};

// ---------- PUBLIC ROUTES (no auth required) ----------
app.use('/api/auth', authRoutes);

// ---------- PROTECTED ROUTES (auth required) ----------
// All routes starting with /api/habits will require a valid JWT
app.use('/api/habits', authMiddleware);

// @route   GET /api/habits
// @desc    Get all habits for the logged-in user
app.get('/api/habits', async (req, res) => {
  try {
    const habits = await Habit.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   POST /api/habits
// @desc    Create a new habit for the logged-in user
app.post('/api/habits', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const newHabit = new Habit({
      title,
      description,
      user: req.userId,   // Associate habit with the authenticated user
    });
    const savedHabit = await newHabit.save();
    res.status(201).json(savedHabit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   DELETE /api/habits/:id
// @desc    Delete a habit (only if it belongs to the user)
app.delete('/api/habits/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found or not authorized' });
    }
    res.json({ message: 'Habit deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   PUT /api/habits/:id/complete
// @desc    Mark habit as done for today (user‑specific)
app.put('/api/habits/:id/complete', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.userId });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found or not authorized' });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const alreadyCompleted = habit.completedDates.some(
      date => date.getTime() === today.getTime()
    );
    if (alreadyCompleted) {
      return res.status(400).json({ error: 'Habit already completed for today' });
    }

    habit.completedDates.push(today);
    await habit.save();
    res.json(habit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// @route   GET /api/habits/:id/streak
// @desc    Get streak for a specific habit (user‑specific)
app.get('/api/habits/:id/streak', async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, user: req.userId });
    if (!habit) {
      return res.status(404).json({ error: 'Habit not found or not authorized' });
    }
    const streak = calculateStreak(habit.completedDates);
    res.json({ streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));