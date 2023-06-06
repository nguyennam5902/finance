const bcrypt = require('bcryptjs');
const API_KEY = 'SOK4MJ8AY4RK33W3';

/**
 * Return current date and time in GMT+7
 * @returns {string} Date and time in GMT+7
 * @see https://stackoverflow.com/a/25559830
 */
function getDateTime() {
  return new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
}

/** 
 * Given a string, check if it is blank
 * @param {string} str 
 * @returns True if `str` == `null` or `str` is `''`
 */
function isBlank(str) {
  return (!str || str.trim().length === 0);
}

/**
* Connect to collection 'accounts' in 'finance' database with username and password
* @param {string} username account's username
* @param {string} password account's password
* @param {boolean} isNeedCheckPassword flag for checking if need to check both username and password
* @returns Promise with flag check if the account exists and otherwise
*/
async function checkAccount(username, password, isNeedCheckPassword) {
  try {
    const acc = (await global.database.collection('accounts').findOne({ 'username': username }));
    if (acc == null) return false;
    else {
      if (isNeedCheckPassword) return (await comparePasswords(password, acc.password));
      else return true;
    }
  } catch (err) { console.error(err) }
}

/** 
 * Compares the plaintext password to saved data in database
 * @param {string} plainPassword 
 * @param {string} hashedPassword 
 * @returns Promise with boolean: True
 */
async function comparePasswords(plainPassword, hashedPassword) {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (e) {
    console.error(`Error while comparing passwords: ${e.message}`);
    return false;
  }
}

/**
 * Generates a hash for the given plaintext password
 * @param {string} password Plaintext password
 * @returns Promise of hashed `password` or `null` (if catch an error)
 */
async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, await bcrypt.genSalt(10));
  } catch (err) {
    console.error(`Error while hashing password: ${err.message}`);
    return null;
  }
}

/** 
 * Given a quote, return quote's name and its price
 * @param {string} quote Quote want to look up
 * @returns Promise with `quote_name` (string) and quote's `price`
 * @see https://www.alphavantage.co/documentation/#latestprice
*/
async function lookupPrice(quote) {
  const priceURL = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${quote}&apikey=${API_KEY}`);
  const data = await priceURL.json();
  const quote_name = data['Global Quote']['01. symbol'];
  const price = data['Global Quote']['05. price'];
  return [quote_name, price];
}


/** 
 * Given a quote, return its company's name
 * @param {string} quote The name of the quote
 * @returns Promise with quote's company name 
 * @see https://www.alphavantage.co/documentation/#fundamentals
 */
async function lookupQuoteCompany(quote) {
  const response = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${quote}&apikey=${API_KEY}`);
  const data = await response.json();
  return data['Name'];
}

/** 
 * Check if a object is type `string`. If true, check if it is blank.
 * @param str String need to check
 * @returns True if `str` is a string and `str` is not blank
 */
function isValidString(str) {
  return typeof str === "string" && str.trim().length > 0;
}

/**
 * Escape special characters.
 * @param {string} s 
 * @see https://github.com/jacebrowning/memegen#special-characters
 */
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
    isLogin: isValidString(global.app.get('username')), top: top, bottom: bottom
  });
}

function isInteger(s) { return parseInt(s) === Number(s); }

module.exports = { getDateTime, isBlank, checkAccount, hashPassword, lookupPrice, lookupQuoteCompany, isValidString, apologyRender, isInteger };