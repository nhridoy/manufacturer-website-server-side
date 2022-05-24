const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Token Verification Middleware
const verifyJWTToken = (req, res, next) => {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    jwt.verify(bearerToken, process.env.SECRET, (err, authData) => {
      if (err) {
        res.sendStatus(403);
      } else {
        req.authData = authData;
        next();
      }
    });
  } else {
    res.sendStatus(403);
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.l6osu.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const run = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const usersCollections = client.db("toolkit").collection("users");
    const itemsCollections = client.db("toolkit").collection("items");
    const blogsCollections = client.db("toolkit").collection("blogs");
    const ordersCollections = client.db("toolkit").collection("orders");

    // Issuing JWT TOKEN
    app.post("/login", async (req, res) => {
      const { email } = req.body;
      const token = jwt.sign({ email }, process.env.SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Upserting User
    app.put("/user", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const update = { $set: user };
      const result = await usersCollections.updateOne(filter, update, options);
      res.send(result);
    });

    // All Users
    app.get("/users", verifyJWTToken, async (req, res) => {
      const users = await usersCollections.find().toArray();
      res.send(users);
    });
  } catch (err) {
    console.error(err);
  } finally {
    // await client.close();
  }
};

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
