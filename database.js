const { MongoClient } = require('mongodb');

// Replace the connection string with your own
// const client = new MongoClient('mongodb+srv://nguyenhainam59:0967918502@chess.gwzx8a7.mongodb.net/?retryWrites=true&w=majority');
const client = new MongoClient('mongodb+srv://test:test@database.uzhnq7w.mongodb.net/');

async function run() {
   try {
      await client.connect();
      const collection = client.db('chess_result').collection('chess_result');
      const aggregation = [{ $match: { 'result': '0-1' } }, { $count: 'result' }];
      const a = collection.aggregate(aggregation);

      await a.forEach(console.log);
   } catch (err) {
      console.error(err);
   } finally {
      await client.close();
   }
}

run().catch(console.error);
