const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const reviewsCollections = client.db("toolkit").collection("reviews");

    // Verify Admin Middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.authData.email;
      const user = await usersCollections.findOne({ email });
      if (user.role === "admin") {
        next();
      } else {
        res.sendStatus(403);
      }
    };

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

    // Make Admin
    app.put("/user/admin", verifyJWTToken, verifyAdmin, async (req, res) => {
      const { email } = req.body;
      const filter = { email };
      const update = { $set: { role: "admin" } };
      const result = await usersCollections.updateOne(filter, update);
      res.send(result);
    });

    // Check Admin
    app.get("/user/admin", verifyJWTToken, async (req, res) => {
      const { email } = req.authData;
      const result = await usersCollections.findOne({ email });
      res.send(result?.role === "admin");
    });

    // All Users
    app.get("/users", verifyJWTToken, async (req, res) => {
      const users = await usersCollections.find().toArray();
      res.send(users);
    });

    // Create Item
    app.post("/products", verifyJWTToken, verifyAdmin, async (req, res) => {
      const item = req.body;
      const result = await itemsCollections.insertOne(item);
      res.send(result);
    });
    // All Items
    app.get("/products", async (req, res) => {
      const items = await itemsCollections.find().toArray();
      res.send(items);
    });
    // Single Item
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const item = await itemsCollections.findOne({ _id: ObjectId(id) });
      res.send(item);
    });
    // Delete Item
    app.delete(
      "/products/:id",
      verifyJWTToken,
      verifyAdmin,
      async (req, res) => {
        const { id } = req.params;
        const result = await itemsCollections.deleteOne({ _id: ObjectId(id) });
        res.send(result);
      }
    );

    // Create Blog
    app.post("/blogs", verifyJWTToken, verifyAdmin, async (req, res) => {
      const blog = req.body;
      const result = await blogsCollections.insertOne(blog);
      res.send(result);
    });
    // All Blogs
    app.get("/blogs", async (req, res) => {
      const blogs = await blogsCollections.find().toArray();
      res.send(blogs);
    });
    // Delete Blog
    app.delete("/blogs/:id", verifyJWTToken, verifyAdmin, async (req, res) => {
      const { id } = req.params;
      const result = await blogsCollections.deleteOne({ _id: ObjectId(id) });
      res.send(result);
    });
    // Get Blog
    app.get("/blogs/:id", async (req, res) => {
      const { id } = req.params;
      const blog = await blogsCollections.findOne({ _id: ObjectId(id) });
      res.send(blog);
    });

    // Create Review
    app.post("/reviews", verifyJWTToken, async (req, res) => {
      const { email } = req.authData;

      const user = await usersCollections.findOne({ email });

      const review = req.body;
      review.user = user;
      const result = await reviewsCollections.insertOne(review);
      res.send(result);
    });
    // All Reviews
    app.get("/reviews", async (req, res) => {
      const reviews = await reviewsCollections.find().toArray();
      res.send(reviews);
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
