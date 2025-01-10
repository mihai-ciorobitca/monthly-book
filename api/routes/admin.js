// routes/admin.js

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

router.get('/', async (req, res) => {
    if (req.session.username !== 'admin') {
        return res.redirect('/');
    }

    let { data: books, error } = await supabaseClient
        .from('books')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error);
        res.status(500).send('Internal Server Error');
        return;
    }

    res.render('admin', { books: books, username: req.session.username });
});

router.post('/approve', async (req, res) => {
    if (req.session.username !== 'admin') {
        return redirect('/');
    }

    const { title } = req.body;

    const { error } = await supabaseClient
        .from('books')
        .update({ status: 'approved' })
        .eq('title', title);

    if (error) {
        console.error('Error approving book:', error);
        return res.status(500).send('Internal Server Error');
    }

    return res.redirect('/');
});

router.post('/reject', async (req, res) => {
    if (req.session.username !== 'admin') {
        return redirect('/');
    }

    const { title } = req.body;

    const { error } = await supabaseClient
        .from('books')
        .update({ status: 'rejected' })
        .eq('title', title);

    if (error) {
        console.error('Error rejecting book:', error);
        return res.status(500).send('Internal Server Error');
    }

    return res.redirect('/');
});

router.post('/delete', async (req, res) => {
    if (req.session.username !== 'admin') {
        return res.redirect('/');
    }

    const { title } = req.body;

    const { error } = await supabaseClient
        .from('books')
        .delete()
        .eq('title', title);

    if (error) {
        console.error('Error deleting book:', error);
        return res.status(500).send('Internal Server Error');
    }

    return res.redirect('/');
});

module.exports = router;