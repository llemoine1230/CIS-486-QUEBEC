import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient, ServerApiVersion } from 'mongodb'

// const uri = "mongodb+srv://laura:laura@cluster0.mfl16pw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express()
const PORT = process.env.PORT || 3000;
const uri = process.env.MONGO_URI;
console.log()


app.use(express.static(join(__dirname, 'public')));


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello Express from Render 😍😍😍. <a href="laura">laura</a>')
})

// endpoints...middlewares...apis?
// send an html file

app.get('/laura', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'laura.html'))
})
app.get('/api/laura', (req, res) => {
  // res.send('barry. <a href="/">home</a>')
  const myVar = 'Hello from server!';
  res.json({ myVar });
})
app.listen(3000)
//Push #1 testing
// TODO: refactor to use the environment port.
app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})