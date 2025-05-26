import express from 'express';
import cors from 'cors';
import listEndpoints from 'express-list-endpoints';
import fs from 'fs';

const app = express();
const port = process.env.PORT || 5050;
app.use(cors());
app.use(express.json());
const thoughts = JSON.parse(fs.readFileSync('./thoughts.json'));

app.get('/', (req, res) => {
  res.json(listEndpoints(app));
});
app.get('/thoughts', (req, res) => {
  res.json(thoughts);
});
app.get('/thoughts/:id', (req, res) => {
  const { id } = req.params;
  const thought = thoughts.find((t) => t.id === Number(id));

  if (thought) {
    res.json(thought);
  } else {
    res.status(404).json({ error: 'Thought not found' });
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

