// routes/main.js

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

const router = express.Router();

router.get('/', async (req, res) => {
    let { data: books, error: booksError } = await supabaseClient
        .from('books')
        .select('*')
        .eq('month', new Date().getMonth() + 1)
        .eq('status', 'approved');

    if (booksError) {
        console.error('Error fetching data:', booksError);
        res.status(500).send('Internal Server Error');
        return;
    }

    let { data: authors, error: authorError } = await supabaseClient
        .from('books')
        .select('author')
    
    authors = authors.reduce((acc, current) => {
        const x = acc.find(item => item.author === current.author);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc;
        }
    }, []);

    if (authorError) {
        console.error('Error fetching data:', authorError);
        res.status(500).send('Internal Server Error');
        return;
    }

    res.render('index', { books: books, username: req.session.username, authors: authors });
});

router.get('/books', async (req, res) => {
    let { data: books, error } = await supabaseClient
        .from('books')
        .select('*')
        .eq('status', 'approved');

    if (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
        return;
    }

    res.render('books', { books: books, username: req.session.username });

});

module.exports = router;