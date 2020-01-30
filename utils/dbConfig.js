const { MongoClient } = require('mongodb');

module.exports = async (collectionName, data) => {
    const url = "mongodb://localhost:27017/";
    const client = new MongoClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    await client.connect();

    await client.db('jobs')
        .collection(collectionName).insertOne(data);
    console.log('1 document inserted!');

    await client.close();
}