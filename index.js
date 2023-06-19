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
global.database = client.db('finance');
const lib = require("./lib");

app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', 'templates');
// Set port
app.set('port', process.env.PORT || 3000);

app.get('/', async (_req, res) => {
    // console.log(app.get('username'));
    if (!lib.isValidString(app.get('username'))) {
        res.redirect('/login');
    } else {
        const pipeline = [{ $match: { username: app.get(`username`) } }, {
            $group: {
                _id: '$symbol',
                company: { $first: '$company' },
                totalShares: { $sum: '$shares' },
                price: { $first: '$price' },
                totalPrice: { $sum: { $multiply: ['$shares', '$price'] } }
            }
        }];
        const rows = await database.collection('transactions').aggregate(pipeline).toArray();
        const acc = await database.collection('accounts').findOne({ username: app.get('username') });
        var body = '', sum = acc.cash;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row.totalShares > 0)
                body = body + `<tr><td>${row._id}</td><td>${row.company}</td><td>${row.totalShares}</td><td>${row.price + ' $'}</td><td>${row.totalPrice.toFixed(2) + ' $'}</td></tr>`;
            sum = sum + row.price * row.totalShares;
        }
        body = body + `<tr><td><b>CASH</b></td><td></td><td></td><td></td><td>${acc.cash.toFixed(2)} $</td></tr><tr><td></td><td></td><td></td><td></td><td><b>${sum.toFixed(2)} $</b></td></tr>`;
        // console.log(rows);
        res.render('index', { isLogin: true, main: `<table><thead><tr><td><b>Symbol</b></td><td><b>Name</b></td><td><b>Shares</b></td><td><b>Price</b></td><td><b>TOTAL</b></td></tr></thead><tbody>${body}</tbody></table>` });
    }
});

app.get('/buy', (_req, res) => {
    if (lib.isValidString(app.get(`username`))) { res.render(`buy`, { isLogin: true }); }
    else { res.redirect('/login'); }
});

app.post('/buy', async (_req, res) => {
    const quote = String(_req.body.symbol), amount = _req.body.shares;
    // console.log(`Quote: ${quote}, amount: ${amount}`);
    if (lib.isValidString(quote)) {
        if (lib.isInteger(amount)) {
            const amountInt = parseInt(amount);
            if (amountInt <= 0) {
                lib.apologyRender(res, 400, `Positive is needed`);
            } else {
                const quoteAndPrice = await lib.lookupPrice(quote);
                if (lib.isValidString(quoteAndPrice.company)) {
                    const companyName = await lib.lookupQuoteCompany(quoteAndPrice.company);
                    const price = quoteAndPrice.price;
                    const allSum = price * amountInt;
                    const acc = await database.collection('accounts').findOne({ username: app.get(`username`) });
                    if (acc.cash < allSum) {
                        // console.log(`${result.cash} < ${allSum}`);
                        lib.apologyRender(res, 400, `Not enough money`);
                    } else {
                        database.collection('transactions').insertOne({
                            username: app.get(`username`),
                            symbol: quoteAndPrice.company,
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
                } else { lib.apologyRender(res, 400, `Quote does not exist`); }
            }
        } else { lib.apologyRender(res, 400, `Int is needed!`); }
    } else { lib.apologyRender(res, 400, `Quote is needed`); }
});

// TODO: #3 Make history show 10 rows only for each page
app.get('/history', async (_req, res) => {
    if (lib.isValidString(app.get('username'))) {
        const header = `<thead><tr><td><b>Symbol</b></td><td><b>Shares</b></td><td><b>Price</b></td><td><b>Transaction's time</b></td></tr></thead>`;
        var body = '';
        const rows = await database.collection('transactions').find({ username: app.get('username') }).toArray();
        // console.log(rows);
        const acc = await database.collection('accounts').findOne({ username: app.get('username') });
        var sum = acc.cash;
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            sum = sum + row.price * row.shares;
            body = body + `<tr><td>${row.symbol}</td><td>${row.shares}</td><td>${row.price} $</td><td>${row.transactionTime}</td></tr>`;
        }
        res.render(`history`, { isLogin: true, main: `<table>${header}<tbody>${body}</tbody></table>` });
    } else { res.redirect('/login'); }
});

app.get('/login', function (_req, res) {
    app.set('username', null);
    res.render('login', { isLogin: false });
});

app.post('/login', async (req, res) => {
    const username = req.body.username, password = req.body.password;
    if (lib.isBlank(username))
        lib.apologyRender(res, 403, 'must provide username');
    else if (lib.isBlank(password))
        lib.apologyRender(res, 403, 'must provide password');
    else {
        const isValid = await lib.checkAccountExist(username, password, true);
        if (isValid) {
            console.log(`username: ${username}, password: ${password}`);
            app.set('username', username); res.redirect('/');
        } else { lib.apologyRender(res, 403, 'invalid username and/or password'); }
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

app.post('/quote', async (_req, res) => {
    const quoteAndPrice = await lib.lookupPrice(String(_req.body.symbol));
    console.log(quoteAndPrice);
    if (lib.isValidString(quoteAndPrice.company)) {
        res.render('quoted', {
            main: `<p>A share of ${await lib.lookupQuoteCompany(quoteAndPrice.company)} costs ${quoteAndPrice.price} $.</p>`
        });
    } else { lib.apologyRender(res, 400, 'Quote does not exist'); }
})

app.get('/register', (_req, res) => {
    res.render('register', { isLogin: false });
});

app.post('/register', async (req, res) => {
    const username = req.body.username, password = req.body.password, confirmation = req.body.confirmation;
    if (lib.isBlank(username)) { lib.apologyRender(res, 400, 'must provide username'); }
    else if (lib.isBlank(password)) { lib.apologyRender(res, 400, 'must provide password'); }
    else if (password !== confirmation) { lib.apologyRender(res, 400, 'Password does not match'); }
    // console.log(`username: ${username}, password: ${password}, confirmation: ${confirmation}`);
    const isExisted = await lib.checkAccountExist(username, password, false);
    if (isExisted) { lib.apologyRender(res, 400, 'The username existed, choose a other one') }
    else {
        database.collection('accounts').insertOne({
            username: username, password: await lib.hashPassword(password), cash: 10000.00
        }, err => {
            if (err) throw err;
            console.log("1 document inserted");
            res.redirect('/login');
        });
    }
});

app.get('/sell', async (_req, res) => {
    if (lib.isValidString(app.get(`username`))) {
        const pipeline = [{ $match: { username: app.get(`username`) } }, {
            $group: {
                _id: '$symbol',
                company: { $first: '$company' },
                totalShares: { $sum: '$shares' },
                price: { $first: '$price' },
                totalPrice: { $sum: { $multiply: ['$shares', '$price'] } }
            }
        }];
        var options = '<option>Symbol</option>';
        await client.db(`finance`).collection('transactions').aggregate(pipeline).toArray().forEach(row => {
            if (row.totalShares > 0) {
                console.log(`${row._id} --> ${row.totalShares}`);
                options = options + `<option>${row._id}</option>`;
            }
        })
        res.render('sell', { isLogin: true, main: `<form action="/sell" method="post"><div class="form-group"><select name="symbol">${options}</select></div><div class="form-group"><input autocomplete="off" autofocus class="form-control" name="shares" placeholder="Shares" type="number"></div><button class="btn btn-primary" type="submit">Sell</button></form>` });
    } else { res.redirect('login'); }
});

app.post('/sell', async (_req, res) => {
    const symbol = _req.body.symbol, amount = _req.body.shares;
    if (lib.isValidString(symbol)) {
        if (lib.isInteger(amount)) {
            var amountInt = parseInt(amount);
            if (amountInt <= 0) { lib.apologyRender(res, 400, 'Positive is needed') }
            else {
                amountInt = amountInt * -1;
                database.collection('transactions').aggregate([
                    { $match: { username: app.get('username'), symbol: symbol } },
                    { $group: { _id: null, totalShares: { $sum: "$shares" } } },
                    { $project: { _id: false, totalShares: true } }
                ]).toArray(async (err, sum_shares) => {
                    if (sum_shares.length == 0) {
                        lib.apologyRender(res, 400, 'Quote does not exist')
                    } else {
                        if (amountInt * -1 > sum_shares[0].totalShares) { lib.apologyRender(res, 400, 'Not enough to purchase') }
                        else {
                            const quoteAndPrice = await lib.lookupPrice(symbol);
                            if (lib.isValidString(quoteAndPrice.company)) {
                                const allSum = quoteAndPrice.price * amountInt;
                                const acc = await database.collection('accounts').findOne({ username: app.get('username') });
                                // console.log('Cash: ' + acc.cash);
                                database.collection('transactions').insertOne({
                                    username: app.get(`username`),
                                    symbol: quoteAndPrice.company,
                                    company: await lib.lookupQuoteCompany(quoteAndPrice.company),
                                    shares: amountInt,
                                    price: quoteAndPrice.price,
                                    cash: acc.cash - allSum,
                                    transactionTime: lib.getDateTime()
                                }).catch(err => { if (err) throw err });
                                database.collection('accounts').updateOne({ username: app.get(`username`) },
                                    { $set: { cash: acc.cash - allSum } })
                                    .catch(err => { if (err) throw err });
                                res.redirect('/');
                            } else { lib.apologyRender(res, 400, 'Quote does not exist'); }
                        }
                    }
                });
            }
        } else { lib.apologyRender(res, 400, 'Int is needed'); }
    } else { lib.apologyRender(res, 400, 'Quote is needed'); }
});

app.get('/setting', async (_req, res) => {
    // TODO: #2 Make Setting page
    if (lib.isValidString(app.get(`username`))) {
        const acc = await client.db('finance').collection('accounts').findOne({ username: app.get(`username`) });
        res.render('setting', { isLogin: true, main: `<div class="form-group"><label for="input-field" style="display: inline-block;">Username: ${app.get(`username`)}\t\t</label>
        <a href ="/change-username"><button class="btn btn-primary"> Change username</button></a>
        </div><div class="form-group"><label for="input-field" style="display: inline-block;">Password:\t\t</label>
        <a href ="/change-password"><button class="btn btn-primary">Change password</button></a></div>
        <div class="form-group"><label for="input-field" style="display: inline-block;">Cash: ${acc.cash.toFixed(2)} $\t\t</label>
        <a href ="/recharge"><button class="btn btn-primary">Recharge</button></a></div>` });
    } else { res.redirect('login'); }
});

app.get('/change-username', (_req, res) => {
    if (lib.isValidString(app.get(`username`))) { res.render('change_username', { isLogin: true }); }
    else { res.redirect('/login'); }
});

app.post('/change-username', async (_req, res) => {
    const newUsername = String(_req.body.username);
    if (lib.isBlank(newUsername) == false) {
        if (newUsername != app.get(`username`)) {
            const isValid = await lib.checkAccountExist(newUsername, null, false);
            if (isValid == false) {
                const database = client.db(`finance`);
                await database.collection(`accounts`).updateOne({ username: app.get(`username`) }, {
                    $set: { username: newUsername }
                });
                console.log("Account updated successfully");
                console.log(newUsername);
                await database.collection(`transactions`).updateMany({ username: app.get(`username`) }, {
                    $set: { username: newUsername }
                });
                console.log("Transactions updated successfully");
                app.set('username', newUsername);
                res.redirect('/');
            } else {
                lib.apologyRender(res, 400, 'The username existed, choose a other one');
            }
        } else { res.redirect('/') }
    } else { lib.apologyRender(res, 400, `Must provide username`) }
});

app.get('/change-password', (_req, res) => {
    if (lib.isValidString(app.get(`username`))) { res.render('change_password', { isLogin: true }); }
    else { res.redirect('/login'); }
});

app.post('/change-password', async (_req, res) => {
    const oldPassword = String(_req.body.old_password), newPassword = String(_req.body.new_password), confirmPassword = String(_req.body.confirm_password);
    if (lib.isBlank(oldPassword)) {
        lib.apologyRender(res, 400, 'must provide old password');
    } else {
        if (lib.isBlank(newPassword) || lib.isBlank(confirmPassword)) {
            lib.apologyRender(res, 400, `must provide new password`);
        } else {
            if (newPassword == confirmPassword) {
                const isValid = await lib.checkAccountExist(app.get(`username`), oldPassword, true);
                if (isValid) {
                    const database = client.db(`finance`);
                    await database.collection(`accounts`).updateOne({ username: app.get(`username`) }, {
                        $set: { password: await lib.hashPassword(newPassword) }
                    });
                    console.log('Password updated successfully')
                    res.redirect('/');
                } else { lib.apologyRender(res, 400, 'invalid username and/or password'); }
            } else { lib.apologyRender(res, 400, 'Password does not match'); }
        }
    }
});

app.get('/recharge', (_req, res) => {
    if (lib.isValidString(app.get(`username`))) {
        res.render('recharge', {
            isLogin: true, main: `
        <form action="/recharge" method="post">
            <div class="form-group">
                <input autocomplete="off" autofocus class="form-control" name="cash" placeholder="Cash" type="number">
            </div>
            <button class="btn btn-primary" type="submit">Recharge</button>
        </form>` });
    }
    else { res.redirect('/login') }
});

app.post('/recharge', (_req, res) => {
    const cashAdd = Number(_req.body.cash);
    if (cashAdd <= 0) {
        lib.apologyRender(res, 400, 'Positive is needed');
    } else {
        console.log(cashAdd);
        client.db(`finance`).collection('accounts').updateOne(
            { username: app.get(`username`) },
            { $inc: { cash: cashAdd } }
        ).then(() => console.log(`Cash updated`));
        res.redirect('/');
    }
});


client.connect();

// Run
app.listen(app.get('port'), () => {
    console.log(`Node app is running on port ${app.get('port')}`);
});