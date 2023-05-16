/** Quotes:
 * Apple Inc. (AAPL)
 * Amazon.com Inc. (AMZN)
 * Microsoft Corporation (MSFT)
 * Alphabet Inc. (GOOGL)
 * Tesla Inc. (TSLA)
 * Facebook Inc. (FB)
 * Johnson & Johnson (JNJ)
 * Procter & Gamble Co. (PG)
 * Visa Inc. (V)
 * JPMorgan Chase & Co. (JPM)
 */

// Build Node
const express = require('express'), fs = require('fs'), app = express();
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
async function checkAccount(username, password, isNeedCheckPassword) {
    try {
        const collection = client.db('finance').collection('accounts');
        var aggregation;
        if (isNeedCheckPassword)
            aggregation = [{ $match: { 'username': username, 'password': password } }, { $count: 'result' }];
        else aggregation = [{ $match: { 'username': username } }, { $count: 'result' }];
        const length = (await collection.aggregate(aggregation).toArray()).length;
        return (length != 0);
    } catch (err) {
        console.error(err);
    }
}
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', 'templates');

const apiKey = 'SOK4MJ8AY4RK33W3';
const isLogin = false;

// Get stocks price
async function lookup(quote) {
    const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${quote}&apikey=SOK4MJ8AY4RK33W3`);
    const data = await response.json();
    const quote_name = data['Global Quote']['01. symbol'];
    const price = data['Global Quote']['05. price'];
    return [quote_name, price];
}

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
        isLogin: isLogin, top: top, bottom: bottom
    });
}

// Set port
app.set('port', process.env.PORT || 3000);

// Build path 
app.get('/login', function (_req, res) {
    res.render('login', { isLogin: isLogin });
});
app.get('apology', (_req, res) => {
    res.render('apology');
});

app.post('/login', (req, res) => {
    const username = req.body.username, password = req.body.password;
    if (isBlank(username))
        apologyRender(res, 403, 'must provide username');
    else if (isBlank(password))
        apologyRender(res, 403, 'must provide password');
    // console.log(`username: ${username}, password: ${password}`);
    checkAccount(username, password, true).then(isValid => {
        if (isValid == true) {
            app.set('username', username);
            res.redirect('/');
        } else {
            apologyRender(res, 403, 'invalid username and/or password');
        }
    });
});
app.get('/logout', (_req, res) => {
    app.set('username', null);
    res.redirect('/login');
});
app.get('/', (_req, res) => {
    if (typeof app.get('username') === "undefined") {
        res.redirect('login');
    } else {
        res.render('index', { isLogin: true });
    }
});
app.get('/quote', (_req, res) => {
    if (typeof app.get('username') === "undefined") {
        res.redirect('login');
    } else {
        res.render('quote');
    }
});
app.post('/quote', (_req, res) => {
    const quote = _req.body.symbol;
    if (isBlank(quote)) {
        apologyRender(res, 400, 'Quote does not exist');
    } else {
        lookup(quote).then(result => {
            res.render('quoted', { main: `<p>A share of ${result[0]} costs ${result[1]}.</p>` });
        });
    }
})
app.get('/register', (_req, res) => {
    res.render('register', { isLogin: isLogin });
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
    checkAccount(username, password, false).then(isValid => {
        if (isValid == true) {
            apologyRender(res, 400, 'The username existed, choose a other one');
        } else {
            // TODO: Add data to 'accounts' collection
            client.db('finance').collection('accounts').insertOne({ username: username, password: password }, (err) => {
                if (err) throw err;
                console.log("1 document inserted");
                res.redirect('login');
            });
        }
    });
});
// Run
app.listen(app.get('port'), () => {
    console.log(`Node app is running on port ${app.get('port')}`);
});
