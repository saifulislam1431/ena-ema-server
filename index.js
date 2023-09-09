const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const userCollection = client.db("enaEmaTech").collection("users");
    const reviewsCollection = client.db("enaEmaTech").collection("reviews");


        // JWT
        app.post("/jwt", async (req, res) => {
          const user = req.body;
          const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '4h' })
          res.send({ token })
        })

    // Admin verify
    const verifyAdmin = async (req, res, next) => {
      const listedEmail = ['saifulislam140301@gmail.com']
      const email = req.decoded.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      if (result?.role !== "admin" && listedEmail.includes(result?.email)) {
        return res.status(403).send({ error: true, message: "Forbidden access" })
      }
      next()
    }




    app.post("/clients-message" , async(req,res)=>{
        const newMessage = req.body;
        const result = await clientsMessageCollection.insertOne(newMessage);
        res.send(result);

    })

    app.get("/clients-message", verifyJWT, verifyAdmin, async(req,res)=>{
      const result = await clientsMessageCollection.find({}).toArray();
      res.send(result);

  })



    // User Apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const email = user.email;
      console.log(email);
      // const existUserEmail = {email: email}
      const existUser = await userCollection.findOne({ email: email });
      if (existUser) {
        return res.json("User Exist");
      }
      else {
        const result = await userCollection.insertOne(user);
        res.send(result);
      }
    })

        // Admin APIs


        app.patch("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) }
          const userUpdate = {
            $set: {
              role: "admin"
            }
          };
          const result = await userCollection.updateOne(filter, userUpdate);
          res.send(result);
        })


        app.delete("/users/admin/delete/:id", verifyJWT, verifyAdmin, async (req, res) => {
          const id = req.params.id;
          const filter = { _id: new ObjectId(id) }
          const result = await userCollection.deleteOne(filter);
          res.send(result);
        })
    
        app.get("/check/admin/:email", async (req, res) => {
          const email = req.params.email;
          const query = { email: email };
          const user = await userCollection.findOne(query);
          const result = { admin: user?.role === "admin" }
          if(user){
          return res.send(result);
          }else{
            res.send(false)
          }
        })

        app.get("/users/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
          const email = req.params.email;
          const query = { email: email };
          const user = await userCollection.findOne(query);
    
          const result = { admin: user?.role === "admin" }
          res.send(result);
        })

        app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
          const result = await userCollection.find().toArray();
          res.send(result)
        })

        app.get("/profile",verifyJWT,verifyJWT, async (req, res) => {
          const email = req.query.email;
          console.log(email);
          const query = {email: email}
            const result = await userCollection.findOne(query);
          res.send(result)

        })


        // Reviews

        app.get("/reviews",async(req,res)=>{
          const result = await reviewsCollection.find({}).toArray();
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