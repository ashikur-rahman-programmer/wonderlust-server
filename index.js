const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

// middleware
app.use(cors());
app.use(express.json());

const uri = process.env.DESTINATION_URI;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// authrization

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.NEXT_PUBLIC_URL}/api/auth/jwks`),
);

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    console.log(payload);

    next();
  } catch (error) {
    return res.status(401).send({ message: "unauthorized access" });
  }
};

async function run() {
  try {
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );

    //database
    const database = client.db("wanderlust");
    const destinationCollection = database.collection("destination");
    const bookingCollection = database.collection("booking");

    // create api

    app.get("/destination", async (req, res) => {
      const result = await destinationCollection.find().toArray();
      res.send(result);
    });

    // page details
    app.get("/destination/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await destinationCollection.findOne(query);
      res.send(result);
    });

    // edit post
    app.patch("/destination/:id", async (req, res) => {
      const id = req.params.id;
      const destination = req.body;
      const query = {
        _id: new ObjectId(id),
      };
      const updateDoc = {
        $set: destination,
      };
      const result = await destinationCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // post
    app.post("/destination", async (req, res) => {
      const destination = req.body;
      const result = await destinationCollection.insertOne(destination);
      res.send(result);
    });

    // deleted api
    app.delete("/destination/:id", async (req, res) => {
      const id = req.params.id;
      const destination = req.body;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await destinationCollection.deleteOne(destination, query);
      res.send(result);
    });

    // booking api
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // get booking

    app.get("/booking/:userId", verifyToken, async (req, res) => {
      const { userId } = req.params;
      const result = await bookingCollection.find({ userId }).toArray();
      res.send(result);
    });

    // post

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // booking cancel / delete
    app.delete("/booking/:bookingId", async (req, res) => {
      const { bookingId } = req.params;

      const query = { _id: bookingId };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    ///
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
