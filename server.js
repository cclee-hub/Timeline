// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/timeline'));
app.use('/tl.js', require('./routes/script'));

app.listen(PORT, () => {
  console.log(`Timeline server running on http://localhost:${PORT}`);
});