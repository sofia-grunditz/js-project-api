import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import listEndpoints from 'express-list-endpoints';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Thought } from './models/Thought.js';
import { User } from './models/User.js';

dotenv.config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost/happyThoughts';
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const app = express();
const port = process.env.PORT || 5050;

app.use(cors());
app.use(express.json());

const generateToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

const authenticateUser = async (req, res, next) => {
  const accessToken = req.header('Authorization');
  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      next();
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Invalid access token' });
  }
};

app.get('/', (req, res) => {
  res.json(listEndpoints(app));
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      const user = new User({ username, password });
      await user.save();
      res.status(201).json({
        userId: user._id,
        username: user.username,
        accessToken: generateToken(user),
      });
    }
  } catch (error) {
    console.log('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      res.status(200).json({
        userId: user._id,
        username: user.username,
        accessToken: generateToken(user),
      });
    } else {
      res.status(401).json({ error: 'Credentials not correct' });
    }
  } catch (error) {
    res.status(400).json({ error: 'Login failed', details: error.message });
  }
});

app.get('/thoughts', async (req, res) => {
  try {
    const thoughts = await Thought.find().sort({ createdAt: -1 }).limit(20);
    res.json(thoughts);
  } catch (error) {
    res.status(500).json({ error: 'Could not fetch thoughts' });
  }
});

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

app.post('/thoughts', authenticateUser, async (req, res) => {
  try {
    const { message } = req.body;
    const newThought = new Thought({ message, user: req.user._id });
    const savedThought = await newThought.save();
    res.status(201).json(savedThought);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/thoughts/:id', authenticateUser, async (req, res) => {
  try {
    const { message } = req.body;
    const thought = await Thought.findById(req.params.id);
    if (!thought) {
      return res.status(404).json({ error: 'Thought not found' });
    }
    if (thought.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only edit your own thoughts' });
    }
    thought.message = message;
    const updatedThought = await thought.save();
    res.status(200).json(updatedThought);
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

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

app.delete('/thoughts/:id', authenticateUser, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) {
      return res.status(404).json({ error: 'Thought not found' });
    }
    if (thought.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own thoughts' });
    }
    await thought.deleteOne();
    res.status(200).json({ message: 'Thought deleted' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid ID format' });
  }
});

app.listen(port);
