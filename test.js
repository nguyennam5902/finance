const lib = require('./lib');
lib.lookupPrice('aapl').then(result=>{
    console.log(result)
})