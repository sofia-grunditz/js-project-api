import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import listEndpoints from 'express-list-endpoints';
import mongoose from 'mongoose';
import { Thought } from './models/Thought.js'; // ✅ Import av modellen

dotenv.config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/happyThoughts';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

// 🔍 ROUTES ---------------------------------------------

// 📍 Root – API-dokumentation
app.get('/', (req, res) => {
  res.json(listEndpoints(app));
});

// 📍 GET /thoughts – hämta 20 senaste
app.get('/thoughts', async (req, res) => {
  try {
    const thoughts = await Thought.find().sort({ createdAt: -1 }).limit(20);
    res.json(thoughts);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch thoughts' });
  }
});

// 📍 GET /thoughts/:id – hämta ett specifikt thought
app.get('/thoughts/:id', async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (thought) {
      res.json(thought);
    } else {
      res.status(404).json({ error: 'Thought not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// 📍 POST /thoughts – skapa ett nytt thought
app.post('/thoughts', async (req, res) => {
  try {
    const { message } = req.body;
    const newThought = new Thought({ message });
    const savedThought = await newThought.save();
    res.status(201).json(savedThought);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 📍 PATCH /thoughts/:id/like – öka hearts med +1
app.patch('/thoughts/:id/like', async (req, res) => {
  try {
    const updatedThought = await Thought.findByIdAndUpdate(
      req.params.id,
      { $inc: { hearts: 1 } },
      { new: true }
    );
    if (updatedThought) {
      res.status(200).json(updatedThought);
    } else {
      res.status(404).json({ error: 'Thought not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// 📍 DELETE /thoughts/:id – ta bort ett thought
app.delete('/thoughts/:id', async (req, res) => {
  try {
    const deletedThought = await Thought.findByIdAndDelete(req.params.id);
    if (deletedThought) {
      res.status(200).json({ message: 'Thought deleted' });
    } else {
      res.status(404).json({ error: 'Thought not found' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

// -------------------------------------------------------

// 🚀 Starta servern
app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
