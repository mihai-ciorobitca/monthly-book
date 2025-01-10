const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: true
}));

const mainRoutes = require('./routes/main.js');
const homeRoutes = require('./routes/home');
const loginRoutes = require('./routes/login');
const registerRoutes = require('./routes/register');
const resetPasswordRoutes = require('./routes/resetPassword');
const adminRoutes = require('./routes/admin');
const logoutRoutes = require('./routes/logout');

app.use('/', mainRoutes)
app.use('/home', homeRoutes);
app.use('/login', loginRoutes);
app.use('/register', registerRoutes);
app.use('/reset-password', resetPasswordRoutes);
app.use('/admin', adminRoutes);
app.use('/logout', logoutRoutes);

app.post('/remove-secret-code', (req, res) => {
    delete req.session.secretCode;
    delete req.session.qrCodeBase64;
    res.redirect('/login');
});

app.get('/qrcode', (req, res) => {
    if (!req.session.secretCode) {
        return res.redirect('/register');
    }
    res.render('qrcode', { qrCodeBase64: req.session.qrCodeBase64, secretCode: req.session.secretCode });
});

app.use((req, res) => {
    res.status(404).render('page404');
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
