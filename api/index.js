const express = require('express');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
    (async () => {
        const { data, error } = await supabaseClient
            .from('books')
            .select('*');

        if (error) {
            console.error('Error fetching data:', error);
            res.status(500).send('Internal Server Error');
            return;
        }

        books = data || [];

        res.render('index', { books: data });
    })();
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});