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
const express = require('express'), app = express();
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb+srv://test:test@database.uzhnq7w.mongodb.net');
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

const API_KEY = 'SOK4MJ8AY4RK33W3';

// Get stocks name, company and price
async function lookupPrice(quote) {
    const priceURL = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${quote}&apikey=${API_KEY}`);
    const data = await priceURL.json();
    const quote_name = data['Global Quote']['01. symbol'];
    const price = data['Global Quote']['05. price'];
    return [quote_name, price];
}
/** Given a quote, return its company's name
 * @param quote: 
 */
async function lookupQuoteCompany(quote) {
    const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${quote}&apikey=${API_KEY}`);
    const data = await response.json();
    const company = data['Name'];
    return company;
}
function isValidString(str) {
    return typeof str === "string" && str.trim().length > 0;
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
        main: `<img alt=${top} class="border" src="http://memegen.link/custom/${top}/${bottom}.jpg?alt=https://i.imgur.com/CsCgN7Ll.png" title=${bottom}>`,
        isLogin: isValidString(app.get('username')), top: top, bottom: bottom
    });
}

function isInteger(s) {
    return parseInt(s) === Number(s);
}

// Set port
app.set('port', process.env.PORT || 3000);

app.get('/', (_req, res) => {
    console.log(app.get('username'));
    if (!isValidString(app.get('username'))) {
        res.redirect('/login');
    } else {
        try {
            const database = client.db('finance');
            const collection = database.collection('transactions');
            const pipeline = [{ $match: { username: app.get(`username`) } }, {
                $group: {
                    _id: '$symbol',
                    company: { $first: '$company' },
                    totalShares: { $sum: '$shares' },
                    price: { $first: '$price' },
                    totalPrice: { $sum: { $multiply: ['$shares', '$price'] } }
                }
            }];
            collection.aggregate(pipeline).toArray().then(rows => {
                database.collection('accounts').findOne({
                    username: app.get('username')
                }).then(cashResult => {
                    const header = '<thead><tr><td><b>Symbol</b></td><td><b>Name</b></td><td><b>Shares</b></td><td><b>Price</b></td><td><b>TOTAL</b></td></tr></thead>';
                    var body = '';
                    var sum = cashResult.cash;
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (row.totalShares > 0)
                            body = body + `<tr>
                                                <td>${row._id}</td>
                                                <td>${row.company}</td>
                                                <td>${row.totalShares}</td>
                                                <td>${row.price + ' $'}</td>
                                                <td>${row.totalPrice + ' $'}</td>
                                            </tr>`;
                        sum = sum + row.price * row.totalShares;
                    }
                    body = body + `<tr>
                                        <td><b>CASH</b></td><td></td><td></td><td></td><td>${cashResult.cash.toFixed(2)} $</td>
                                    </tr>
                                    <tr><td></td><td></td><td></td><td></td><td><b>${sum} $</b></td></tr>`;
                    console.log(rows);
                    res.render('index', {
                        isLogin: isValidString(app.get('username')),
                        main: `<table>${header}<tbody>${body}</tbody></table>`
                    });
                });
            });
        } catch (err) {
            console.error(err);
        }
    }
});


app.get('/buy', (_req, res) => {
    if (isValidString(app.get(`username`))) {
        res.render(`buy`, { isLogin: isValidString(app.get('username')) });
    }
    else {
        res.redirect('/login');
    }
});

app.post('/buy', (_req, res) => {
    const quote = _req.body.symbol, amount = _req.body.shares;
    console.log(`Quote: ${quote}, amount: ${amount}`);
    if (isValidString(quote)) {
        if (isInteger(amount)) {
            const amountInt = parseInt(amount);
            if (amountInt < 0) {
                apologyRender(res, 400, `Positive is needed`);
            } else {
                lookupPrice(quote).then(quoteAndPrice => {
                    if (isValidString(quoteAndPrice[0]) && isValidString(quoteAndPrice[1])) {
                        lookupQuoteCompany(quoteAndPrice[0]).then(companyName => {
                            console.log(`${quoteAndPrice[0]} --> ${companyName}`);
                            const price = parseFloat(quoteAndPrice[1]);
                            const allSum = price * amountInt;
                            try {
                                const database = client.db('finance');
                                database.collection('accounts').findOne({
                                    username: app.get(`username`)
                                }).then(acc => {
                                    if (acc.cash < allSum) {
                                        // console.log(`${result.cash} < ${allSum}`);
                                        apologyRender(res, 400, `Not enough money`);
                                    } else {
                                        database.collection('transactions').insertOne({
                                            username: app.get(`username`),
                                            symbol: quoteAndPrice[0],
                                            company: companyName,
                                            shares: amountInt,
                                            price: price,
                                            cash: acc.cash - allSum
                                        }).then(console.log('Document inserted')).catch(err => {
                                            if (err) { console.log('ERROR'); throw err; }
                                        });
                                        database.collection('accounts').updateOne({
                                            username: app.get(`username`)
                                        }, { $set: { cash: acc.cash - allSum } }).then(console.log('Document updated'))
                                            .catch(err => { if (err) { console.log('ERROR'); throw err; } });
                                        res.redirect('/');
                                    }
                                });
                            } catch (err) { console.error(err); }
                        }).catch(err => { if (err) throw err; });
                    } else { apologyRender(res, 400, `Quote does not exist`); }
                });

            }
        } else {
            apologyRender(res, 400, `Int is needed!`);
        }
    } else {
        apologyRender(res, 400, `Quote is needed`);
    }
});

app.get('/history', (_req, res) => {
    if (isValidString(app.get('username'))) {
        try {
            const header = '<thead><tr><td><b>Symbol</b></td><td><b>Shares</b></td><td><b>Price</b></td></tr></thead>';
            var body = '';
            const database = client.db('finance');
            database.collection('transactions').find({ username: app.get('username') }).toArray().then(rows => {
                console.log(rows);
                database.collection('accounts').findOne({ username: app.get('username') }).then(acc => {
                    var sum = acc.cash;
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        sum = sum + row.price * row.shares;
                        body = body + `<tr><td>${row.symbol}</td><td>${row.shares}</td><td>${row.price} $</td></tr>`;
                    }
                    res.render(`history`, {
                        isLogin: isValidString(app.get('username')),
                        main: `<table>${header}<tbody>${body}</tbody></table>`
                    });
                });
            });
        } catch (err) {
            console.error(err);
        }
    } else {
        res.redirect('/login');
    }
});

// Build path 
app.get('/login', function (_req, res) {
    app.set('username', null);
    res.render('login', { isLogin: false });
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
                res.redirect('/');
            } else {
                apologyRender(res, 403, 'invalid username and/or password');
            }
        });
    }
});

app.get('/logout', (_req, res) => {
    app.set('username', null);
    res.redirect('/');
});

app.get('/quote', (_req, res) => {
    if (!isValidString(app.get(`username`))) {
        res.redirect('login');
    } else {
        res.render('quote', { isLogin: true });
    }
});

app.post('/quote', (_req, res) => {
    const quote = _req.body.symbol;
    lookupPrice(quote).then(quoteAndPrice => {
        if (isValidString(quoteAndPrice[0]) && isValidString(quoteAndPrice[1])) {
            lookupQuoteCompany(quoteAndPrice[0]).then(companyName => {
                res.render('quoted', {
                    isLogin: isValidString(app.get(`username`)),
                    main: `<p>A share of ${companyName} costs ${quoteAndPrice[1]} $.</p>`
                });
            }).catch(err => { if (err) throw err; });
        } else {
            apologyRender(res, 400, 'Quote does not exist');
        }
    });
})

app.get('/register', (_req, res) => {
    res.render('register', { isLogin: false });
});

app.post('/register', (req, res) => {
    const username = req.body.username, password = req.body.password, confirmation = req.body.confirmation;
    if (isBlank(username)) {
        apologyRender(res, 400, 'must provide username');
    } else if (isBlank(password)) {
        apologyRender(res, 400, 'must provide password');
    } else if (password !== confirmation) {
        apologyRender(res, 400, 'Password does not match');
    }
    // console.log(`username: ${username}, password: ${password}, confirmation: ${confirmation}`);
    checkAccount(username, password, false).then(isValid => {
        if (isValid == true) {
            apologyRender(res, 400, 'The username existed, choose a other one');
        } else {
            client.db('finance').collection('accounts').insertOne({
                username: username, password: password, cash: 10000.00
            }, err => {
                if (err) throw err;
                console.log("1 document inserted");
                res.redirect('/login');
            });
        }
    });
});

app.get('/sell', (_req, res) => {
    if (isValidString(app.get(`username`))) {
        try {
            client.db('finance').collection('transactions').distinct('symbol', { username: app.get('username') }).then(symbols => {
                var options = '<option>Symbol</option>';
                for (let i = 0; i < symbols.length; i++) {
                    const symbol = symbols[i];
                    options = options + `<option>${symbol}</option>`;
                }
                console.log(symbols);
                res.render('sell', { isLogin: true, main: `<form action="/sell" method="post"><div class="form-group"><select name="symbol">${options}</select></div><div class="form-group"><input autocomplete="off" autofocus class="form-control" name="shares" placeholder="Shares" type="number"></div><button class="btn btn-primary" type="submit">Sell</button></form>` });
            });
        } catch (err) {
            console.error(err);
        }
    } else {
        res.redirect('login');
    }
})
app.post('/sell', (_req, res) => {
    const symbol = _req.body.symbol;
    const amount = _req.body.shares;
    if (isValidString(symbol)) {
        if (isInteger(amount)) {
            const amountInt = parseInt(amount);
            if (amountInt < 0) {
                apologyRender(res, 400, 'Positive is needed');
            } else {
                try {
                    lookupPrice(symbol).then(quoteAndPrice => {
                        if (isValidString(quoteAndPrice[0]) && isValidString(quoteAndPrice[1])) {
                            //TODO: SELL
                            const database= client.db('finance');
                            // database.collection('transactions');
                            database.collection('transactions').distinct('symbol', { username: app.get('username') }).then(symbols => {
                                var options = '<option>Symbol</option>';
                                for (let i = 0; i < symbols.length; i++) {
                                    const symbol = symbols[i];
                                    options = options + `<option>${symbol}</option>`;
                                }
                                console.log(symbols);
                                res.render('sell', { isLogin: true, main: `<form action="/sell" method="post"><div class="form-group"><select name="symbol">${options}</select></div><div class="form-group"><input autocomplete="off" autofocus class="form-control" name="shares" placeholder="Shares" type="number"></div><button class="btn btn-primary" type="submit">Sell</button></form>` });
                            });
                        } else {
                            apologyRender(res, 400, 'Quote does not exist');
                        }
                    });
                } catch (err) { console.error(err); }
            }
        } else {
            apologyRender(res, 400, 'Int is needed');
        }
    } else {
        apologyRender(res, 400, 'Quote is needed');
    }
});
// Run
app.listen(app.get('port'), () => {
    console.log(`Node app is running on port ${app.get('port')}`);
});
