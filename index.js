// Build Node
const express = require('express'), fs = require('fs'), app = express();
const ejs = require('ejs');
const res = require('express/lib/response');
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb+srv://test:test@database.uzhnq7w.mongodb.net/');
client.connect();
function isBlank(str) {
    return (!str || str.trim().length === 0);
}
/**
 * Connect to collection 'accounts' inside database 'finance' with username and password
 * @param username
 * @param password
 * @returns bool: True if the account exists and otherwise
 */
async function checkAccount(username, password) {
    try {
        const collection = client.db('finance').collection('accounts');
        const aggregation = [{ $match: { 'username': username, 'password': password } }, { $count: 'result' }];
        const a = collection.aggregate(aggregation).toArray();
        const length = (await a).length;
        return (length != 0);
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
app.get('apology', (_req, res) => {
    res.render('apology');
});
function escape(s) {
    const replacements = [["-", "--"], [" ", "-"], ["_", "__"], ["?", "~q"], ["%", "~p"], ["#", "~h"], ["/", "~s"], ["\"", "''"]];
    for (var i = 0; i < replacements.length; i++)
        s = s.replace(replacements[i][0], replacements[i][1]);
    return s;
}

function apologyRender(res, top, bottom) {
    bottom = escape(bottom);
    res.render('apology', {
        main: '<img alt="' + top + '" class="border" src="http://memegen.link/custom/' + top + '/' + bottom + '.jpg?alt=https://i.imgur.com/CsCgN7Ll.png" title=' + bottom + '>',
        top: top, bottom: bottom
    });
}

app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    if (isBlank(username))
        apologyRender(res, 403, 'must provide username');
    else if (isBlank(password))
        apologyRender(res, 403, 'must provide password');
    // console.log(`username: ${username}, password: ${password}`);
    checkAccount(username, password).then(isValid => {
        if (isValid == true) {
            // res.send('Succeed');
        } else {
            apologyRender(res, 403, 'invalid username and/or password');
        }
    });
});

app.get('/', (_req, res) => {
    res.render('login');
});
app.get('/register', (_req, res) => {
    res.render('register');
});
app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const confirmation = req.body.confirmation;
    if (isBlank(username)) {
        apologyRender(res, 400, 'must provide username');
    } else if (isBlank(password)) {
        apologyRender(res, 400, 'must provide password');
    } else if (password !== confirmation) {
        apologyRender(res, 400, 'Password does not match');
    }
    console.log(`username: ${username}, password: ${password}, confirmation: ${confirmation}`);
    // here you can save the data to a database or perform any other necessary actions
    checkAccount(username, password).then(isValid => {
        if (isValid == true) {
            apologyRender(res, 400, 'The username existed, choose a other one');
        } else {
            res.send('Register successful');
        }
    });
});
// Run
app.listen(app.get('port'), () => {
    console.log(`Node app is running on port ${app.get('port')}`);
});
