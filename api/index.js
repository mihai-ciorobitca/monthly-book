const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const session = require('express-session');
const crypto = require('crypto');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: crypto.randomBytes(64).toString('hex'),
    resave: false,
    saveUninitialized: true
}));

function requireLogin(req, res, next) {
    if (req.session.loggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
}

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.loggedIn = true;
        res.redirect('/admin');
    } else {
        res.status(401).send('Invalid credentials');
    }
});

app.get('/admin', requireLogin, (req, res) => {
    res.render('admin');
});

app.post('/admin/add-book', requireLogin, async (req, res) => {
    const { title, author, opinion, month, year, cover_image_base64 } = req.body;

    console.log('Adding book:', title, author, opinion, month, year, cover_image_base64);

    try {
        const { data: bookData, error: insertError } = await supabaseClient
            .from('books')
            .insert([{ title, author, opinion, cover_image: cover_image_base64, month, year }]);

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

app.get('/', async (req, res) => {
    const { data, error } = await supabaseClient
        .from('books')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
        return;
    }

    res.render('index', { books: data });
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
