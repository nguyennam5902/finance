async function getStockPrice(symbol) {
  const apiKey = 'YOUR_API_KEY'; // replace with your own Alpha Vantage API key
  // const symbol = 'AAPL'; // the stock symbol you want to get the price for
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const price = data['Global Quote']['05. price'];
    return price;
  } catch (error) {
    console.error('Error fetching stock price:', error);
  }
}


async function lookup(quote) {
  const response = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${quote}&apikey=SOK4MJ8AY4RK33W3`);
  const data = await response.json();
  const quote_name = data['Global Quote']['01. symbol'];
  const price = data['Global Quote']['05. price'];
  return price;
}

lookup(`AAPL`).then(price => { console.log(price) });