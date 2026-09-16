require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRouter = require('./modules/auth');
const studentsRouter = require('./modules/students');
const mentorsRouter = require('./modules/mentors');
const testsRouter = require('./modules/tests');
const adminRouter = require('./modules/admin');
const aiRouter = require('./modules/ai');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/students', studentsRouter);
app.use('/api/mentors', mentorsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Eklavya backend listening on port ${PORT}`);
});
