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

// Get stocks price
async function lookup(quote) {
    const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${quote}&apikey=${apiKey}`);
    const data = await response.json();
    const quote_name = data['Global Quote']['01. symbol'];
    const price = data['Global Quote']['05. price'];
    return [quote_name, price];
}
function isUndefined(value) {
    return typeof value === 'undefined';
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
        isLogin: isUndefined(app.get('username')), top: top, bottom: bottom
    });
}

function isInteger(s) {
    return parseInt(s) === Number(s);
}

// Set port
app.set('port', process.env.PORT || 3000);

app.get('/', (_req, res) => {
    console.log(app.get('username'));
    if (isUndefined(app.get('username'))) {
        res.render('login', { isLogin: !isUndefined(app.get('username')) });
    } else {
        res.render('index', { isLogin: !isUndefined(app.get('username')) });
    }
});


app.get('/buy', (_req, res) => {
    res.render(`buy`, { isLogin: isUndefined(app.get('username')) });
});
app.post('/buy', (_req, res) => {
    var quote = _req.body.symbol;
    var amount = _req.body.shares;
    console.log(`Quote: ${quote}, amount: ${amount}`);
    if (isInteger(amount)) {
        amount = parseInt(amount);
        if (amount < 0) {
            apologyRender(res, 400, `Positive is needed`);
        }
        lookup(quote).then(result => {
            if (isUndefined(result[0]) == false && isUndefined(result[1]) == false) {
                console.log(`Price: ${result[1]}`);
            } else {

            }
        });
    } else {
        apologyRender(res, 400, `Int is needed!`);
    }
});

app.get('/history', (_req, res) => {
    res.render(`history`, { isLogin: isUndefined(app.get('username')) });
});

// Build path 
app.get('/login', function (_req, res) {
    res.render('login', { isLogin: isUndefined(app.get('username')) });
});

app.post('/login', (req, res) => {
    const username = req.body.username, password = req.body.password;
    if (isBlank(username))
        apologyRender(res, 403, 'must provide username');
    else if (isBlank(password))
        apologyRender(res, 403, 'must provide password');
    // console.log(`username: ${username}, password: ${password}`);
    else {
        checkAccount(username, password, true).then(isValid => {
            if (isValid == true) {
                app.set('username', username);
                res.render('index', { isLogin: true });
            } else {
                apologyRender(res, 403, 'invalid username and/or password');
            }
        });
    }
});

app.get('/logout', (_req, res) => {
    isLogin = false;
    app.set('username', null);
    res.redirect('/login');
});

app.get('/quote', (_req, res) => {
    if (isUndefined(app.get(`username`))) {
        res.redirect('login');
    } else {
        res.render('quote', { isLogin: isUndefined(app.get('username')) });
    }
});

app.post('/quote', (_req, res) => {
    const quote = _req.body.symbol;
    lookup(quote).then(result => {
        if (isUndefined(result[0]) == false && isUndefined(result[1]) == false) {
            res.render('quoted', { main: `<p>A share of ${result[0]} costs ${result[1]} $.</p>` });
        } else {
            apologyRender(res, 400, 'Quote does not exist');
        }
    });
})

app.get('/register', (_req, res) => {
    res.render('register', { isLogin: isUndefined(app.get('username')) });
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
    // console.log(`username: ${username}, password: ${password}, confirmation: ${confirmation}`);
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

app.get('/sell', (_req, res) => {

})
app.post('/sell', (_req, res) => {

})
// Run
app.listen(app.get('port'), () => {
    console.log(`Node app is running on port ${app.get('port')}`);
});
