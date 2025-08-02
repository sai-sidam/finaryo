// index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    console.log("GET / hit");
    res.send('Finaryo backend is running 🎉');
  });
  app.post('/api/expenses', (req, res) => {
    const { name, amount } = req.body;
  
    if (!name || !amount) {
      return res.status(400).json({ error: 'Missing name or amount' });
    }
  
    // Just a placeholder response for now
    res.status(201).json({ message: 'Expense saved!', data: { name, amount } });
  });

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
