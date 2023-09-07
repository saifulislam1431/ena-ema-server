const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@cluster0.8cnv71c.mongodb.net/?retryWrites=true&w=majority`;

app.use(cors());
app.use(express.json());


// JWT verify
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Unauthorized Access" })
  }
  const token = authorization.split(' ')[1]
  // console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "Unauthorized Access" })
    }
    req.decoded = decoded;
    next();
  })


}




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

    const clientsMessageCollection = client.db("enaEmaTech").collection("clientsMessage");


    // Admin verify
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      if (result?.role !== "admin") {
        return res.status(403).send({ error: true, message: "Forbidden access" })
      }
      next()
    }

    // Question Verify

    const verifyQuestion = async (req, res, next) =>{

      //TODO
      
    }


    app.post("/clients-message" , async(req,res)=>{
        const newMessage = req.body;
        const result = await clientsMessageCollection.insertOne(newMessage);
        res.send(result);

    })


    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Server successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get("/", (req,res)=>{
    res.send("Server Is Running")
})

app.listen(port , ()=>{
    console.log(`This server listening at port ${port}`);
})