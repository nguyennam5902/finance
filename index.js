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
const express = require('express');
const { MongoClient } = require('mongodb');
global.app = express();
global.client = new MongoClient('mongodb+srv://test:test@database.uzhnq7w.mongodb.net');
global.database = global.client.db('finance');
const lib = require("./lib");

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', 'templates');
// Set port
app.set('port', process.env.PORT || 3000);

app.get('/', (_req, res) => {
    // console.log(app.get('username'));
    if (!lib.isValidString(app.get('username'))) {
        res.redirect('/login');
    } else {
        try {
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
                            body = body + `<tr><td>${row._id}</td><td>${row.company}</td><td>${row.totalShares}</td><td>${row.price + ' $'}</td><td>${row.totalPrice.toFixed(2) + ' $'}</td></tr>`;
                        sum = sum + row.price * row.totalShares;
                    }
                    body = body + `<tr><td><b>CASH</b></td><td></td><td></td><td></td><td>${cashResult.cash.toFixed(2)} $</td></tr><tr><td></td><td></td><td></td><td></td><td><b>${sum} $</b></td></tr>`;
                    // console.log(rows);
                    res.render('index', { isLogin: true, main: `<table>${header}<tbody>${body}</tbody></table>` });
                });
            });
        } catch (err) { console.error(err); }
    }
});

app.get('/buy', (_req, res) => {
    if (lib.isValidString(app.get(`username`))) { res.render(`buy`, { isLogin: true }); }
    else { res.redirect('/login'); }
});

app.post('/buy', (_req, res) => {
    const quote = _req.body.symbol, amount = _req.body.shares;
    // console.log(`Quote: ${quote}, amount: ${amount}`);
    if (lib.isValidString(quote)) {
        if (lib.isInteger(amount)) {
            const amountInt = parseInt(amount);
            if (amountInt < 0) {
                lib.apologyRender(res, 400, `Positive is needed`);
            } else {
                lib.lookupPrice(quote).then(quoteAndPrice => {
                    if (lib.isValidString(quoteAndPrice[0]) && lib.isValidString(quoteAndPrice[1])) {
                        lib.lookupQuoteCompany(quoteAndPrice[0]).then(companyName => {
                            // console.log(`${quoteAndPrice[0]} --> ${companyName}`);
                            const price = parseFloat(quoteAndPrice[1]);
                            const allSum = price * amountInt;
                            try {
                                database.collection('accounts').findOne({
                                    username: app.get(`username`)
                                }).then(acc => {
                                    if (acc.cash < allSum) {
                                        // console.log(`${result.cash} < ${allSum}`);
                                        lib.apologyRender(res, 400, `Not enough money`);
                                    } else {
                                        database.collection('transactions').insertOne({
                                            username: app.get(`username`),
                                            symbol: quoteAndPrice[0],
                                            company: companyName,
                                            shares: amountInt,
                                            price: price,
                                            cash: acc.cash - allSum,
                                            transactionTime: lib.getDateTime()
                                        }).catch(err => { if (err) throw err; });
                                        database.collection('accounts').updateOne({
                                            username: app.get(`username`)
                                        }, { $set: { cash: acc.cash - allSum } })
                                            .catch(err => { if (err) throw err; });
                                        res.redirect('/');
                                    }
                                });
                            } catch (err) { console.error(err); }
                        }).catch(err => { if (err) throw err; });
                    } else { lib.apologyRender(res, 400, `Quote does not exist`); }
                });
            }
        } else { lib.apologyRender(res, 400, `Int is needed!`); }
    } else { lib.apologyRender(res, 400, `Quote is needed`); }
});

app.get('/history', (_req, res) => {
    if (lib.isValidString(app.get('username'))) {
        try {
            const header = `<thead><tr><td><b>Symbol</b></td><td><b>Shares</b></td><td><b>Price</b></td><td><b>Transaction's time</b></td></tr></thead>`;
            var body = '';
            database.collection('transactions').find({ username: app.get('username') }).toArray().then(rows => {
                // console.log(rows);
                database.collection('accounts').findOne({ username: app.get('username') }).then(acc => {
                    var sum = acc.cash;
                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        sum = sum + row.price * row.shares;
                        body = body + `<tr><td>${row.symbol}</td><td>${row.shares}</td><td>${row.price} $</td><td>${row.transactionTime}</td></tr>`;
                    }
                    res.render(`history`, { isLogin: true, main: `<table>${header}<tbody>${body}</tbody></table>` });
                });
            });
        } catch (err) { console.error(err); }
    } else { res.redirect('/login'); }
});

app.get('/login', function (_req, res) {
    app.set('username', null);
    res.render('login', { isLogin: false });
});

app.post('/login', (req, res) => {
    const username = req.body.username, password = req.body.password;
    if (lib.isBlank(username))
        lib.apologyRender(res, 403, 'must provide username');
    else if (lib.isBlank(password))
        lib.apologyRender(res, 403, 'must provide password');
    // console.log(`username: ${username}, password: ${password}`);
    else {
        lib.checkAccount(username, password, true).then(isValid => {
            if (isValid) {
                app.set('username', username); res.redirect('/');
            } else { lib.apologyRender(res, 403, 'invalid username and/or password'); }
        });
    }
});

app.get('/logout', (_req, res) => {
    app.set('username', null);
    res.redirect('/');
});

app.get('/quote', (_req, res) => {
    if (!lib.isValidString(app.get(`username`))) {
        res.redirect('login');
    } else {
        res.render('quote', { isLogin: true });
    }
});

app.post('/quote', (_req, res) => {
    const quote = _req.body.symbol;
    lib.lookupPrice(quote).then(quoteAndPrice => {
        if (lib.isValidString(quoteAndPrice[0]) && lib.isValidString(quoteAndPrice[1])) {
            lib.lookupQuoteCompany(quoteAndPrice[0]).then(companyName => {
                res.render('quoted', {
                    isLogin: lib.isValidString(app.get(`username`)),
                    main: `<p>A share of ${companyName} costs ${quoteAndPrice[1]} $.</p>`
                });
            }).catch(err => { if (err) throw err; });
        } else {
            lib.apologyRender(res, 400, 'Quote does not exist');
        }
    });
})

app.get('/register', (_req, res) => {
    res.render('register', { isLogin: false });
});

app.post('/register', (req, res) => {
    const username = req.body.username, password = req.body.password, confirmation = req.body.confirmation;
    if (lib.isBlank(username)) { lib.apologyRender(res, 400, 'must provide username'); }
    else if (lib.isBlank(password)) { lib.apologyRender(res, 400, 'must provide password'); }
    else if (password !== confirmation) { lib.apologyRender(res, 400, 'Password does not match'); }
    // console.log(`username: ${username}, password: ${password}, confirmation: ${confirmation}`);
    lib.checkAccount(username, password, false).then(isValid => {
        if (isValid == true) { lib.apologyRender(res, 400, 'The username existed, choose a other one') }
        else {
            lib.hashPassword(password).then(hashResult => {
                database.collection('accounts').insertOne({
                    username: username, password: hashResult, cash: 10000.00
                }, err => {
                    if (err) throw err;
                    // console.log("1 document inserted");
                    res.redirect('/login');
                });
            })

        }
    });
});

app.get('/sell', (_req, res) => {
    if (lib.isValidString(app.get(`username`))) {
        try {
            database.collection('transactions').distinct('symbol', { username: app.get('username') }).then(symbols => {
                var options = '<option>Symbol</option>';
                for (let i = 0; i < symbols.length; i++) {
                    const symbol = symbols[i];
                    options = options + `<option>${symbol}</option>`;
                }
                // console.log(symbols);
                res.render('sell', { isLogin: true, main: `<form action="/sell" method="post"><div class="form-group"><select name="symbol">${options}</select></div><div class="form-group"><input autocomplete="off" autofocus class="form-control" name="shares" placeholder="Shares" type="number"></div><button class="btn btn-primary" type="submit">Sell</button></form>` });
            });
        } catch (err) { console.error(err); }
    } else { res.redirect('login'); }
});

app.post('/sell', (_req, res) => {
    const symbol = _req.body.symbol, amount = _req.body.shares;
    if (lib.isValidString(symbol)) {
        if (lib.isInteger(amount)) {
            var amountInt = parseInt(amount);
            if (amountInt < 0) { lib.apologyRender(res, 400, 'Positive is needed') }
            else {
                amountInt = amountInt * -1;
                try {
                    const transactions = database.collection('transactions');
                    transactions.aggregate([
                        { $match: { username: app.get('username'), symbol: symbol } },
                        { $group: { _id: null, totalShares: { $sum: "$shares" } } },
                        { $project: { _id: false, totalShares: true } }
                    ]).toArray((err, sum_shares) => {
                        if (sum_shares.length == 0) {
                            lib.apologyRender(res, 400, 'Quote does not exist')
                        } else {
                            if (amountInt * -1 > sum_shares[0].totalShares) { lib.apologyRender(res, 400, 'Not enough to purchase') }
                            else {
                                lib.lookupPrice(symbol).then(quoteAndPrice => {
                                    if (lib.isValidString(quoteAndPrice[0]) && lib.isValidString(quoteAndPrice[1])) {
                                        lib.lookupQuoteCompany(quoteAndPrice[0]).then(companyName => {
                                            const price = parseFloat(quoteAndPrice[1]);
                                            const allSum = price * amountInt;
                                            database.collection('accounts').findOne({ username: app.get('username') }).then(acc => {
                                                // console.log('Cash: ' + acc.cash);
                                                database.collection('transactions').insertOne({
                                                    username: app.get(`username`),
                                                    symbol: quoteAndPrice[0],
                                                    company: companyName,
                                                    shares: amountInt,
                                                    price: price,
                                                    cash: acc.cash - allSum,
                                                    transactionTime: lib.getDateTime()
                                                }).catch(err => { if (err) throw err });
                                                database.collection('accounts').updateOne(
                                                    { username: app.get(`username`) },
                                                    { $set: { cash: acc.cash - allSum } })
                                                    .catch(err => { if (err) throw err });
                                                res.redirect('/');
                                            });
                                        });
                                    } else { lib.apologyRender(res, 400, 'Quote does not exist'); }
                                });
                            }
                        }
                    });
                }
                catch (err) { console.error(err); }
            }
        } else { lib.apologyRender(res, 400, 'Int is needed'); }
    } else { lib.apologyRender(res, 400, 'Quote is needed'); }
});

global.client.connect();

// Run
app.listen(app.get('port'), () => {
    console.log(`Node app is running on port ${app.get('port')}`);
});
