// routes/home.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

function requireLogin(req, res, next) {
    if (req.session.username) {
        next();
    } else {
        res.redirect('/login');
    }
}

router.get('/', requireLogin, (req, res) => {
    if (req.session.username === 'admin') {
        return res.redirect('/admin');
    }
    res.render('home', { username: req.session.username, recoveryCode: req.session.recoveryCode });
});

router.post('/add-book', requireLogin, async (req, res) => {
    const { title, author, opinion, cover_image_base64 } = req.body;

    try {
        const { error: insertError } = await supabaseClient
            .from('books')
            .insert([{ username: req.session.username, title, author, opinion, cover_image: cover_image_base64, month: new Date().getMonth()+1, year: new Date().getFullYear() }]);

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

router.get('/books', requireLogin, async (req, res) => {
    if (req.session.username === 'admin') {
        return res.redirect('/admin');
    }
    let { data: books, error } = await supabaseClient
        .from('books')
        .select('*')
        .eq('username', req.session.username);

    if (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
        return;
    }

    res.render('my-books', { books: books, username: req.session.username });
});

// Export the router
module.exports = router;
