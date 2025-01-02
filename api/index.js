const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
const svgCaptcha = require('svg-captcha');
const dotenv = require('dotenv');
const speakeasy = require('speakeasy');
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

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

function requireLogin(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/login', (_, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const { data: user, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user:', error);
        return res.status(500).send('Internal Server Error');
    }

    if (user && user.password === crypto.createHash('sha256').update(password).digest('hex')) {
        req.session.username = username;
        req.session.recoveryCode = user.recovery_code;
        res.redirect('/home');
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, password, captcha } = req.body;

    const hashedCaptcha = crypto.createHash('sha256').update(captcha).digest('hex');

    if (hashedCaptcha !== req.session.captcha) {
        return res.status(400).render('register', { error: `Invalid captcha` });
    }

    const { data: existingUser, error: fetchError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking user existence:', fetchError);
        return res.status(500).send('Internal Server Error');
    }

    if (existingUser) {
        return res.status(400).render('register', { error: 'User already exists' });
    }

    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const secret = speakeasy.generateSecret({ length: 20 });

    const { error: insertError } = await supabaseClient
        .from('users')
        .insert([{ username, password: hashedPassword, recovery_code: secret.base32 }]);

    if (insertError) {
        console.error('Error registering user:', insertError);
        return res.status(500).send('Internal Server Error');
    }

    const qrCodeUrl = speakeasy.otpauthURL({ secret: secret.base32, label: username, issuer: 'Monthly Book' });
    const qrCodeBase64 = await new Promise((resolve, reject) => {
        require('qrcode').toDataURL(qrCodeUrl, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });

    req.session.secretCode = secret.base32;
    req.session.qrCodeBase64 = qrCodeBase64;

    res.redirect('/qrcode');
});

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

app.get('/captcha', (req, res) => {
    const captcha = svgCaptcha.create();
    const hashedCaptcha = crypto.createHash('sha256').update(captcha.text).digest('hex');
    req.session.captcha = hashedCaptcha;
    res.type('svg');
    res.status(200).send(captcha.data);
});

app.get('/home', requireLogin, (req, res) => {
    res.render('home', { username: req.session.username, recoveryCode: req.session.recoveryCode });
});

app.post('/home/add-book', requireLogin, async (req, res) => {
    const { title, author, opinion, cover_image_base64 } = req.body;

    try {
        const { error: insertError } = await supabaseClient
            .from('books')
            .insert([{ username: req.session.username, title, author, opinion, cover_image: cover_image_base64, month: new Date().toLocaleString('default', { month: 'long' }), year: new Date().getFullYear() }]);

        if (insertError) {
            console.error('Error adding book:', insertError);
            return res.status(500).send('Internal Server Error');
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/reset-password', (_, res) => {
    res.render('reset');
});

app.post('/reset-password', async (req, res) => {
    const { otpId, otpCode, newPassword } = req.body;

    const { data: user, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('recovery_code', otpId)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user:', error);
        return res.status(500).send('Internal Server Error');
    }

    if (!user) {
        return res.status(400).render('reset', { error: 'Invalid OTP ID' });
    }

    const verified = speakeasy.totp.verify({
        secret: user.recovery_code,
        encoding: 'base32',
        token: otpCode
    });

    if (!verified) {
        return res.status(400).render('reset', { error: 'Invalid OTP Code' });
    }

    const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    const { error: updateError } = await supabaseClient
        .from('users')
        .update({ password: hashedPassword })
        .eq('recovery_code', otpId);

    if (updateError) {
        console.error('Error updating password:', updateError);
        return res.status(500).send('Internal Server Error');
    }

    res.redirect('/login');
});

app.get('/', async (req, res) => {
    const { data, error } = await supabaseClient
        .from('books')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
        return;
    }

    res.render('index', { books: data, username: req.session.username });
});

app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/login');
    });
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
