const express = require('express'), app = express(), bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb+srv://test:test@database.uzhnq7w.mongodb.net');
const database = client.db('finance');
/**
 * Return current date and time in GMT+7
 * 
 * @see https://stackoverflow.com/questions/10087819/convert-date-to-another-timezone-in-javascript
 */
function getDateTime() {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
}

function isBlank(str) {
  return (!str || str.trim().length === 0);
}

/**
* Connect to collection 'accounts' in 'finance' database with username and password
* @param username account's username
* @param password account's password
* @param isNeedCheckPassword flag for checking if need to check both username and password
* @returns True if the account exists and otherwise
*/
async function checkAccount(username, password, isNeedCheckPassword) {
  try {
    const collection = database.collection('accounts');
    const condition = { 'username': username };
    const acc = (await collection.findOne(condition));
    if (acc == null) {
      return false;
    } else {
      if (isNeedCheckPassword) {
        return (await comparePasswords(password, acc.password));
      } else {
        return true;
      }
    }
  } catch (err) { console.error(err); }
}


async function comparePasswords(plainPassword, hashedPassword) {
  try {
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
  } catch (e) {
    console.error(`Error while comparing passwords: ${e.message}`);
    return false;
  }
}
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (e) {
    console.error(`Error while hashing password: ${e.message}`);
    return null;
  }
}



// Get stocks name, company and price
async function lookupPrice(quote) {
  const priceURL = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${quote}&apikey=${API_KEY}`);
  const data = await priceURL.json();
  const quote_name = data['Global Quote']['01. symbol'];
  const price = data['Global Quote']['05. price'];
  return [quote_name, price];
}
/** Given a quote, return its company's name
* @param quote
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
module.exports = {
  getDateTime,
  isBlank,
  checkAccount,
  comparePasswords,
  hashPassword,
  lookupPrice,
  lookupQuoteCompany,
  isValidString,
  escape,
  apologyRender,
  isInteger
};