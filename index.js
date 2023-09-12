const express = require("express");
const cors = require("cors");
require("dotenv").config();
const nodemailer = require('nodemailer');
const MailGen = require('mailgen');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_User}:${process.env.DB_Pass}@ena-ema-technologies.mwy1cxr.mongodb.net/?retryWrites=true&w=majority`;

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


let config = {
  host: 'premium75.web-hosting.com',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail email address
    pass: process.env.EMAIL_PASS,  // Your Gmail password or an app-specific password
  },
  secure: true,
  port: 465,
}

const transporter = nodemailer.createTransport(config);


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
    const sendMessagesCollection = client.db("enaEmaTech").collection("sendMessages");


    // JWT
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '4h' })
      res.send({ token })
    })

    // Admin verify
    const verifyAdmin = async (req, res, next) => {

      const email = req.decoded.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      if (result?.role !== "admin") {
        return res.status(403).send({ error: true, message: "Forbidden access" })
      }
      else {
        next()
      }
    }


    // Client Message manage

    app.post("/clients-message", async (req, res) => {
      const newMessage = req.body;
      const result = await clientsMessageCollection.insertOne(newMessage);
      res.send(result);

    })

    app.get("/clients-message", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await clientsMessageCollection.find({}).toArray();
      res.send(result);

    })


    app.patch('/message/confirm/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const newSendReq = req.body;
      // console.log(newSendReq);
      const id = req.params.id;
      // console.log(id);
      const filter = { _id: new ObjectId(id) }




      try {
        if (newSendReq && id) {
          const emailInfo = {
            from: "support@enaema.com",   // Your email address
            to: newSendReq.receiver, // Client's email address
            subject: newSendReq.subject,
            text: newSendReq.message,
          };
          // console.log(emailInfo);
          await transporter.sendMail(emailInfo);

          const messageUpdate = {
            $set: {
              status: "Opened"
            }
          };
          const result = await clientsMessageCollection.updateOne(filter, messageUpdate);
          console.log(result);
          res.send(result)

          // res.status(200).json({ message: 'Message confirmed and email sent!' });

        }
      }
      // Send a confirmation email to the client
      catch(error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });




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
      if (user) {
        return res.send(result);
      } else {
        res.send(false)
      }
    })

    app.get("/users/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);

      if (user?.role === "admin") {
        const result = { admin: user?.role === "admin" }
        return res.send(result);
      } else {
        return res.status(403).send({ error: true, message: "Access denied" })
      }

    })

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result)
    })

    app.get("/profile", verifyJWT, verifyJWT, async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email }
      const result = await userCollection.findOne(query);
      res.send(result)

    })

    // app.patch("/message/:id", verifyJWT, verifyAdmin, async (req, res) => {
    //   const id = req.params.id;
    //   console.log(id);
    //   const filter = { _id: new ObjectId(id) }
    //   const messageUpdate = {
    //     $set: {
    //       status: "Opened"
    //     }
    //   };
    //   const result = await clientsMessageCollection.updateOne(filter, messageUpdate);
    //   console.log(result);
    //   // res.send(result);
    // })


    // Reviews

    app.get("/reviews", async (req, res) => {
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




app.get("/", (req, res) => {
  res.send("Server Is Running")
})

app.listen(port, () => {
  console.log(`This server listening at port ${port}`);
})