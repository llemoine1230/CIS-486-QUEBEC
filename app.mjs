import express from 'express'
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { MongoClient, ServerApiVersion, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express()
const PORT = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.static(join(__dirname, 'public')));

app.use(express.json());

// const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = process.env.MONGO_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Keep the connection open for our CRUD operations
let db;
let isConnected = false;

async function connectDB() {
  try {
    console.log("🔄 Attempting to connect to MongoDB...");
    await client.connect();
    // Test the connection
    await client.db("admin").command({ ping: 1 });
    db = client.db("school"); // Database name
    isConnected = true;
    console.log("✅ Connected to MongoDB successfully!");
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    console.log("🔧 Check your MongoDB Atlas setup:");
    console.log("   1. Is your IP whitelisted?");
    console.log("   2. Are your credentials correct?");
    console.log("   3. Is your cluster running?");
    isConnected = false;
  }
}

connectDB();

// JWT Secret (in production, this should be in .env file)
const JWT_SECRET = 'super-secret-key-for-demo-only';

// JWT Middleware - Protect routes that require authentication
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user; // Add user info to request
    next();
  });
}


app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'assignment-tracker.html'));
})


// AUTHENTICATION ENDPOINTS FOR TEACHING
// Collection: users (documents with username, password fields)

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 5) {
      return res.status(400).json({ error: 'Password must be at least 5 characters long' });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = { username, password: hashedPassword, createdAt: new Date() };
    const result = await db.collection('users').insertOne(user);

    console.log(`✅ New user registered: ${username}`);

    res.status(201).json({
      message: 'User registered successfully',
      userId: result.insertedId,
      username: username
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ error: 'Failed to register user: ' + error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;


    // Simple validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Create JWT token
    const tokenPayload = {
      userId: user._id,
      username: user.username
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

    console.log(`✅ User logged in: ${username}`);

    res.json({
      message: 'Login successful',
      token: token,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ error: 'Failed to login: ' + error.message });
  }
});

// Get current user info (protected route example)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } } // Don't return password
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info: ' + error.message });
  }
});

// CRUD ENDPOINTS FOR TASK MANAGER
// Collection: tasks (documents with title, description, status, priority, dueDate fields)

// CREATE - Add a new assignment (PROTECTED)
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, course } = req.body;

    // Simple validation
    if (!title) {
      return res.status(400).json({ error: 'Assignment title is required' });
    }

    const assignment = {
      title,
      course: course || '',
      createdBy: req.user.username, // Track who created this assignment
      createdAt: new Date()
    };
    const result = await db.collection('tasks').insertOne(assignment);

    console.log(`✅ Assignment created by ${req.user.username}: ${title}`);

    res.status(201).json({
      message: 'Assignment created successfully',
      assignmentId: result.insertedId,
      assignment: { ...assignment, _id: result.insertedId }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create assignment: ' + error.message });
  }
});

// READ - Get all tasks (PROTECTED)
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await db.collection('tasks').find({}).sort({ createdAt: -1 }).toArray();
    console.log(`📋 ${req.user.username} viewed ${tasks.length} tasks`);
    res.json(tasks); // Return just the array for frontend simplicity
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks: ' + error.message });
  }
});

// UPDATE - Update an assignment by ID (PROTECTED)
app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, course } = req.body;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid assignment ID' });
    }

    const updateData = { updatedBy: req.user.username, updatedAt: new Date() };
    if (title) updateData.title = title;
    if (course !== undefined) updateData.course = course;

    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    console.log(`✏️ Assignment updated by ${req.user.username}: ${id}`);

    res.json({
      message: 'Assignment updated successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update assignment: ' + error.message });
  }
});

// DELETE - Delete a task by ID (PROTECTED)
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const result = await db.collection('tasks').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    console.log(`🗑️ Task deleted by ${req.user.username}: ${id}`);

    res.json({
      message: 'Task deleted successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task: ' + error.message });
  }
});

// TOGGLE - Toggle task completion (PROTECTED)
app.patch('/api/tasks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // First, get the current task
    const task = await db.collection('tasks').findOne({ _id: new ObjectId(id) });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Toggle completion status
    const newCompleted = !task.completed;
    const newStatus = newCompleted ? 'completed' : 'pending';

    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          completed: newCompleted,
          status: newStatus,
          updatedBy: req.user.username,
          updatedAt: new Date()
        }
      }
    );

    console.log(`${newCompleted ? '✅' : '⏳'} Task toggled by ${req.user.username}: ${task.title}`);

    res.json({
      message: `Task ${newCompleted ? 'completed' : 'reopened'} successfully`,
      completed: newCompleted,
      status: newStatus
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle task: ' + error.message });
  }
});

// SEED - Add sample data for teaching (PROTECTED)
app.post('/api/seed', authenticateToken, async (req, res) => {
  try {
    // First, clear existing data
    await db.collection('tasks').deleteMany({});

    // Sample assignments for students (insert all, not just one)
    const sampleTasks = [
      {
        title: "Create Mini App",
        course: "CIS-486",
        createdBy: req.user.username,
        createdAt: new Date()
      },
      {
        title: "Simulation Scenario D",
        course: "MG-395",
        createdBy: req.user.username,
        createdAt: new Date()
      },
      {
        title: "Read Chapters 7-8",
        course: "CIS-476",
        createdBy: req.user.username,
        createdAt: new Date()
      }
    ];

    const result = await db.collection('tasks').insertMany(sampleTasks);

    console.log(`🌱 Database seeded by ${req.user.username}: ${result.insertedCount} assignments`);

    res.json({
      message: `Database seeded successfully! Added ${result.insertedCount} sample assignments.`,
      insertedCount: result.insertedCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed database: ' + error.message });
  }
});

// CLEANUP - Remove all task data (PROTECTED)
app.delete('/api/cleanup', authenticateToken, async (req, res) => {
  try {
    const result = await db.collection('tasks').deleteMany({});

    console.log(`🧹 Database cleaned by ${req.user.username}: ${result.deletedCount} tasks removed`);

    res.json({
      message: `Database cleaned successfully! Removed ${result.deletedCount} tasks.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cleanup database: ' + error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})