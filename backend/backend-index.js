import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { adminAuth, db } from "./firebase-admin.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // changeme
    methods: ["GET", "POST"],
  },
});

const roomHistory = {};
const roomUsers = {};

// middleware to verify FB token
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("[Auth] Token verification failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// REST API endpoints
app.post("/api/auth/verify", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token required" });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    });
  } catch (error) {
    console.error("[Auth] Token verification failed:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

app.post("/api/projects", verifyToken, async (req, res) => {
  try {
    const { name, strokes, roomId } = req.body;
    const userId = req.user.uid;

    const projectData = {
      name: name || "Untitled",
      userId,
      strokes,
      roomId: roomId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await db.collection("projects").add(projectData);

    res.json({
      id: docRef.id,
      ...projectData,
    });

    console.log(`[API] Project saved: ${docRef.id} by ${userId}`);
  } catch (error) {
    console.error("[API] Save project error:", error);
    res.status(500).json({ error: "Failed to save project" });
  }
});

app.get("/api/projects", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    const snapshot = await db
      .collection("projects")
      .where("userId", "==", userId)
      .orderBy("updatedAt", "desc")
      .get();

    const projects = [];
    snapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.json({ projects });
    console.log(`[API] Fetched ${projects.length} projects for ${userId}`);
  } catch (error) {
    console.error("[API] Get projects error:", error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.get("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const projectId = req.params.id;

    const doc = await db.collection("projects").doc(projectId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = { id: doc.id, ...doc.data() };

    // Check if user owns this project
    if (project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(project);
  } catch (error) {
    console.error("[API] Get project error:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.put("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const projectId = req.params.id;
    const { name, strokes } = req.body;

    const docRef = db.collection("projects").doc(projectId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = doc.data();
    if (project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updates = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (strokes !== undefined) updates.strokes = strokes;

    await docRef.update(updates);

    res.json({ id: projectId, ...project, ...updates });
    console.log(`[API] Project updated: ${projectId}`);
  } catch (error) {
    console.error("[API] Update project error:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

app.delete("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const projectId = req.params.id;

    const docRef = db.collection("projects").doc(projectId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = doc.data();
    if (project.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await docRef.delete();

    res.json({ success: true });
    console.log(`[API] Project deleted: ${projectId}`);
  } catch (error) {
    console.error("[API] Delete project error:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register-user", ({ userId, roomId }) => {
    // if no uid, generate one
    const assignedUserId =
      userId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    socket.data.userId = assignedUserId;

    socket.emit("user-registered", { userId: assignedUserId });

    console.log(`User registered: ${assignedUserId}`);
  });

  socket.on("join-room", (roomId) => {
    // reject if noUID found
    if (!socket.data.userId) {
      console.error("User tried to join room before registering!");
      socket.emit("error", { message: "Must register before joining room" });
      return;
    }

    socket.join(roomId);
    const userId = socket.data.userId;
    console.log(`User ${userId} (${socket.id}) joined room: ${roomId}`);

    if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
    roomUsers[roomId].add(userId);

    // send history to new user
    if (roomHistory[roomId]) {
      socket.emit("history", roomHistory[roomId]);
    }

    socket.to(roomId).emit("user-joined", { userId, roomId });
  });

  socket.on("draw", ({ roomId, stroke }) => {
    if (!roomHistory[roomId]) roomHistory[roomId] = [];
    roomHistory[roomId].push(stroke);

    socket.to(roomId).emit("draw", stroke);
  });

  socket.on("undo", ({ roomId, strokeId }) => {
    if (roomHistory[roomId]) {
      roomHistory[roomId] = roomHistory[roomId].filter(
        (s) => s.id !== strokeId,
      );
    }
    socket.to(roomId).emit("undo", strokeId);
  });

  socket.on("disconnect", () => {
    if (!socket.data.userId) {
      console.log("User disconnected before registering:", socket.id);
      return;
    }

    const userId = socket.data.userId;
    console.log("User disconnected:", userId, socket.id);

    for (const roomId in roomUsers) {
      if (roomUsers[roomId].has(userId)) {
        roomUsers[roomId].delete(userId);
        socket.to(roomId).emit("user-left", { userId, roomId });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
