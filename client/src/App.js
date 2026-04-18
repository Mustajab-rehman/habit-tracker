import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import API from './api';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';

// Habits Dashboard Component (your existing habit tracker UI)
function Dashboard({ token, setToken }) {
  const [habits, setHabits] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    setLoading(true);
    try {
      const res = await API.get('/habits');
      setHabits(res.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch habits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const res = await API.post('/habits', { title, description });
      setHabits([res.data, ...habits]);
      setTitle('');
      setDescription('');
      setError('');
    } catch (err) {
      setError('Failed to create habit');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    try {
      await API.delete(`/habits/${id}`);
      setHabits(habits.filter(h => h._id !== id));
      setError('');
    } catch (err) {
      setError('Failed to delete habit');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isCompletedToday = (completedDates) => {
    if (!completedDates || completedDates.length === 0) return false;
    const today = new Date().setUTCHours(0, 0, 0, 0);
    return completedDates.some(date => new Date(date).setUTCHours(0, 0, 0, 0) === today);
  };

  const handleComplete = async (id) => {
    setLoading(true);
    try {
      const res = await API.put(`/habits/${id}/complete`);
      setHabits(habits.map(h => h._id === id ? res.data : h));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as done');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStreak = (completedDates) => {
    if (!completedDates || completedDates.length === 0) return 0;
    const sorted = [...completedDates]
      .map(d => new Date(d).setUTCHours(0, 0, 0, 0))
      .sort((a, b) => b - a);
    const today = new Date().setUTCHours(0, 0, 0, 0);
    let streak = 0, current = today;
    for (let date of sorted) {
      if (date === current) {
        streak++;
        current -= 86400000;
      } else break;
    }
    return streak;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return (
    <div className="App">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🌱 Habit Tracker</h1>
        <button onClick={handleLogout}>Logout</button>
      </header>

      <form onSubmit={handleSubmit} className="habit-form">
        <input
          type="text"
          placeholder="Habit title (e.g., Read)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Habit'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading && <p>Loading...</p>}
      {habits.length === 0 && !loading && <p>✨ Add your first habit!</p>}

      <div className="habits-list">
        {habits.map(habit => (
          <div key={habit._id} className="habit-card">
            <h3>{habit.title}</h3>
            {habit.description && <p>{habit.description}</p>}
            <p>Created: {new Date(habit.createdAt).toLocaleDateString()}</p>
            <p>🔥 Streak: {getStreak(habit.completedDates)} days</p>
            <button
              onClick={() => handleComplete(habit._id)}
              disabled={loading || isCompletedToday(habit.completedDates)}
            >
              {isCompletedToday(habit.completedDates) ? '✅ Done Today' : 'Mark as Done'}
            </button>
            <button onClick={() => handleDelete(habit._id)} disabled={loading} style={{ marginLeft: '8px' }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App with Routing
function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <Login setToken={setToken} /> : <Navigate to="/" />} />
        <Route path="/register" element={!token ? <Register setToken={setToken} /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <Dashboard token={token} setToken={setToken} /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;