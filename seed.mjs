import 'dotenv/config'
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGO_URI;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Sample assignment data
const sampleAssignments = [
  {
    title: "Create Mini App",
    class: "CIS-486",
    createdBy: "admin",
    createdAt: new Date()
  },
  {
    title: "Simulation Scenario D",
    class: "MG-395",
    createdBy: "admin",
    createdAt: new Date()
  },
    {
    title: "Read Chapters 7-8",
    class: "CIS-476",
    createdBy: "admin",
    createdAt: new Date()
  },
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const db = client.db("school");
    const collection = db.collection("tasks"); // Using tasks collection for assignments

    // Check if assignments already exist
    const existingCount = await collection.countDocuments();
    console.log(`Found ${existingCount} existing assignments`);

    if (existingCount > 0) {
      console.log("🗑️  Clearing existing assignments before seeding...");
      await collection.deleteMany({});
      console.log("✅ Existing data cleared");
    }

    // Insert sample assignments
    const result = await collection.insertMany(sampleAssignments);
    console.log(`✅ Successfully seeded ${result.insertedCount} assignments!`);
    
    // Display inserted assignments
    console.log("\n📚 Sample assignments added:");
    sampleAssignments.forEach((assignment, index) => {
      console.log(`${index + 1}. ${assignment.title} - Class: ${assignment.class}`);
    });

    // Fetch and display all assignments from DB for verification
    const allAssignments = await collection.find({}).toArray();
    console.log("\n🔎 All assignments in DB after seeding:");
    allAssignments.forEach((assignment, idx) => {
      console.log(`${idx + 1}. ${assignment.title} - Class: ${assignment.class}`);
    });

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    // Close the connection
    await client.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Run the seed function
seedDatabase().catch(console.dir);
