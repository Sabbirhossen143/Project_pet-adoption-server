require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

const app = express();

const port = process.env.PORT || 5000;



// =========================
// Middleware
// =========================

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());

app.use(cookieParser());



// =========================
// MongoDB URI
// =========================

const uri = process.env.MONGODB_URI;



// =========================
// MongoDB Client
// =========================

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});



// =========================
// Collections
// =========================

let petsCollection;

let requestsCollection;



// =========================
// MongoDB Connect Function
// =========================

async function connectDB() {

  await client.connect();

  console.log("MongoDB Connected");

  const database = client.db("petAdoptionDB");

  petsCollection = database.collection("pets");

  requestsCollection = database.collection("requests");

  console.log("Collections Ready");
}



// =========================
// JWT API
// =========================

app.post("/jwt", async (req, res) => {

  const user = req.body;

  const token = jwt.sign(
    user,
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

  res
    .cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    })
    .send({ success: true });
});



// =========================
// Logout API
// =========================

app.post("/logout", async (req, res) => {

  res
    .clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
    })
    .send({ success: true });
});



// =========================
// Add Pet API
// =========================

app.post("/pets", async (req, res) => {

  try {

    const petData = req.body;

    const result = await petsCollection.insertOne(
      petData
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Add Pet",
    });
  }
});



// =========================
// Get All Pets API
// =========================

app.get("/pets", async (req, res) => {

  try {

    const search = req.query.search || "";

    const species = req.query.species || "";

    const query = {};



    // Search By Name
    if (search) {

      query.petName = {
        $regex: search,
        $options: "i",
      };
    }



    // Filter By Species
    if (species) {

      query.species = {
        $in: [species],
      };
    }



    const result = await petsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Fetch Pets",
    });
  }
});



// =========================
// Get Single Pet API
// =========================

app.get("/pets/:id", async (req, res) => {

  try {

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await petsCollection.findOne(
      query
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Fetch Pet",
    });
  }
});



// =========================
// Create Adoption Request
// =========================

app.post("/requests", async (req, res) => {

  try {

    const requestData = req.body;

    const result = await requestsCollection.insertOne(
      requestData
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Create Request",
    });
  }
});



// =========================
// Get My Requests
// =========================

app.get("/requests", async (req, res) => {

  try {

    const email = req.query.email;

    const query = {
      userEmail: email,
    };

    const result = await requestsCollection
      .find(query)
      .toArray();

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Fetch Requests",
    });
  }
});


// =========================
// Get My Listings
// =========================

app.get("/my-pets", async (req, res) => {

  try {

    const email = req.query.email;

    const query = {
      ownerEmail: email,
    };

    const result = await petsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Fetch Listings",
    });
  }
});


// =========================
// Delete Pet
// =========================

app.delete("/pets/:id", async (req, res) => {

  try {

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await petsCollection.deleteOne(
      query
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Delete Pet",
    });
  }
});


// =========================
// Get Requests By Pet
// =========================

app.get("/pet-requests/:id", async (req, res) => {

  try {

    const petId = req.params.id;

    const query = {
      petId: petId,
    };

    const result = await requestsCollection
      .find(query)
      .toArray();

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Fetch Requests",
    });
  }
});


// =========================
// Approve Request
// =========================

app.patch("/approve-request/:id", async (req, res) => {

  try {

    const id = req.params.id;

    const requestQuery = {
      _id: new ObjectId(id),
    };



    // Update Request Status
    const updateRequest = await requestsCollection.updateOne(
      requestQuery,
      {
        $set: {
          status: "approved",
        },
      }
    );



    // Find Approved Request
    const approvedRequest = await requestsCollection.findOne(
      requestQuery
    );



    // Mark Pet Adopted
    await petsCollection.updateOne(
      {
        _id: new ObjectId(approvedRequest.petId),
      },
      {
        $set: {
          adopted: true,
        },
      }
    );



    res.send(updateRequest);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Approve Request",
    });
  }
});


// =========================
// Reject Request
// =========================

app.patch("/reject-request/:id", async (req, res) => {

  try {

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await requestsCollection.updateOne(
      query,
      {
        $set: {
          status: "rejected",
        },
      }
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Reject Request",
    });
  }
});


// =========================
// Update Pet
// =========================

app.put("/pets/:id", async (req, res) => {

  try {

    const id = req.params.id;

    const updatedData = req.body;

    const query = {
      _id: new ObjectId(id),
    };

    const updatedDoc = {
      $set: updatedData,
    };

    const result = await petsCollection.updateOne(
      query,
      updatedDoc
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Update Pet",
    });
  }
});


// =========================
// Cancel Request
// =========================

app.delete("/requests/:id", async (req, res) => {

  try {

    const id = req.params.id;

    const query = {
      _id: new ObjectId(id),
    };

    const result = await requestsCollection.deleteOne(
      query
    );

    res.send(result);

  } catch (error) {

    console.log(error);

    res.status(500).send({
      message: "Failed To Cancel Request",
    });
  }
});



// =========================
// Root Route
// =========================

app.get("/", (req, res) => {

  res.send("Pet Adoption Server Running");
});



// =========================
// Start Server
// =========================

async function startServer() {

  try {

    await connectDB();

    app.listen(port, () => {

      console.log(`Server running on port ${port}`);
    });

  } catch (error) {

    console.log(error);
  }
}

startServer();