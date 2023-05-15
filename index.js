// Build Node
const express = require('express'), fs = require('fs'), app = express();
const ejs = require('ejs');
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb+srv://test:test@database.uzhnq7w.mongodb.net/');
client.connect();
/**
 * Connect to collection 'accounts' inside database 'finance' with username and password
 */
async function run(username, password) {
    try {
        const collection = client.db('finance').collection('accounts');
        const aggregation = [{ $match: { 'username': username, 'password': password } }, { $count: 'result' }];
        const a = collection.aggregate(aggregation).toArray();
        console.log((await a).length);
    } catch (err) {
        console.error(err);
    }
}


app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', 'templates');

const apiKey = 'INSERT_YOUR_API_KEY_HERE';
const symbol = 'GOOGL';

// Get stocks price
// fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`)
//     .then(response => response.json())
//     .then(data => {
//         const price = data['Global Quote']['05. price'];
//         console.log(`The real-time price of ${symbol} is ${price}`);
//     })
//     .catch(error => console.error(error));


// Set port
app.set('port', process.env.PORT || 3000);

// Build path 
app.get('/login', function (req, res) {
    res.render('login');
});
app.get('/layout', (_req, res) => {
    res.render('layout');
});
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    console.log(`username: ${username}, password: ${password}`);
    // here you can save the data to a database or perform any other necessary actions
    run(username, password).catch(console.error());
    res.send('Login successful');
});

app.get('/', (_req, res) => {
    res.render(__dirname + '/templates/login.ejs');
});
app.get('/register', (_req, res) => {
    res.sendFile(__dirname + '/templates/register.html');
});
app.post('/register', (req, res) => {
    console.log("Register");
    const username = req.body.username;
    const password = req.body.password;
    const confirmation = req.body.confirmation;
    console.log(`username: ${username}, password: ${password}, confirmation: ${confirmation}`);
    // here you can save the data to a database or perform any other necessary actions
    res.send('Login successful');
});
// Run
app.listen(app.get('port'), () => {
    console.log(`Node app is running on port ${app.get('port')}`);
});
