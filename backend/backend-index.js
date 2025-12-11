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
    const { name, strokes, roomId, isPrivate } = req.body;
    const ownerId = req.user.uid;

    const projectData = {
      name: name || "Untitled",
      ownerId,
      collaborators: [],
      isPrivate: isPrivate ?? false,
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

    console.log(
      `[API] Project saved: ${docRef.id} (${projectData.isPrivate ? "private" : "public"}) by owner ${ownerId}`,
    );
  } catch (error) {
    console.error("[API] Save project error:", error);
    res.status(500).json({ error: "Failed to save project" });
  }
});

app.get("/api/projects", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;

    // projects they own
    const ownedSnapshot = await db
      .collection("projects")
      .where("ownerId", "==", userId)
      .get();

    // projects they've joined
    const allProjectsSnapshot = await db.collection("projects").get();

    const projects = [];
    ownedSnapshot.forEach((doc) => {
      projects.push({
        id: doc.id,
        ...doc.data(),
        isOwner: true,
      });
    });

    //! TODO: FIX
    // transitioned to code based filtering after making collaborators an object
    // not really ideal for scale, but this will be the temporary solution
    allProjectsSnapshot.forEach((doc) => {
      const data = doc.data();

      // skip if owned
      if (data.ownerId === userId) return;

      // check if user is in collaborators
      const collaborators = data.collaborators || {};
      const isOldFormat = Array.isArray(collaborators);

      let isCollaborator = false;
      let userRole = null;

      if (isOldFormat) {
        isCollaborator = collaborators.includes(userId);
        userRole = "editor"; // old format = editor, backward compatibility
      } else {
        isCollaborator = !!collaborators[userId];
        userRole = collaborators[userId];
      }

      if (isCollaborator) {
        projects.push({
          id: doc.id,
          ...data,
          isOwner: false,
          userRole,
        });
      }
    });

    res.json({ projects });
    console.log(`[API] Fetched ${projects.length} projects for user ${userId}`);
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

    // check if user is owner or collaborator
    const isOwner = project.ownerId === userId;
    const isCollaborator = project.collaborators?.includes(userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      ...project,
      isOwner,
    });
  } catch (error) {
    console.error("[API] Get project error:", error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.put("/api/projects/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const projectId = req.params.id;
    const { name, strokes, isPrivate } = req.body;

    const docRef = db.collection("projects").doc(projectId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = doc.data();

    const isOwner = project.ownerId === userId;
    const isCollaborator = project.collaborators?.includes(userId);

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (isPrivate !== undefined && !isOwner) {
      return res
        .status(403)
        .json({ error: "Only owner can change privacy settings" });
    }

    const updates = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (strokes !== undefined) updates.strokes = strokes;
    if (isPrivate !== undefined) updates.isPrivate = isPrivate;

    await docRef.update(updates);

    res.json({ id: projectId, ...project, ...updates });
    console.log(
      `[API] Project updated: ${projectId} by ${isOwner ? "owner" : "collaborator"} ${userId}`,
    );
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
    // only owner has delete perms
    if (project.ownerId !== userId) {
      return res.status(403).json({ error: "Only owner can delete project" });
    }

    await docRef.delete();

    res.json({ success: true });
    console.log(`[API] Project deleted: ${projectId} by owner ${userId}`);
  } catch (error) {
    console.error("[API] Delete project error:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// check access
app.get("/api/rooms/:roomId/access", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { roomId } = req.params;

    // find project
    const snapshot = await db
      .collection("projects")
      .where("roomId", "==", roomId)
      .limit(1)
      .get();

    // if no project linked, its open
    if (snapshot.empty) {
      return res.json({
        canAccess: true,
        isPrivate: false,
        role: "guest",
      });
    }

    const project = snapshot.docs[0].data();

    // public
    if (!project.isPrivate) {
      return res.json({
        canAccess: true,
        isPrivate: false,
        role: "guest",
      });
    }

    // private, check ownership
    const isOwner = project.ownerId === userId;
    const isCollaborator = project.collaborators?.includes(userId);

    if (isOwner) {
      return res.json({
        canAccess: true,
        isPrivate: true,
        role: "owner",
        projectId: snapshot.docs[0].id,
      });
    }

    if (isCollaborator) {
      return res.json({
        canAccess: true,
        isPrivate: true,
        role: "collaborator",
        projectId: snapshot.docs[0].id,
      });
    }

    // no auth
    return res.json({
      canAccess: false,
      isPrivate: true,
      role: null,
    });
  } catch (error) {
    console.error("[API] Check room access error:", error);
    res.status(500).json({ error: "Failed to check access" });
  }
});

// add collaborator
app.post("/api/projects/:id/collaborators", verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const projectId = req.params.id;
    const { collaboratorId, role } = req.body;

    if (!collaboratorId) {
      return res.status(400).json({ error: "collaboratorId required" });
    }

    // validate roles
    const validRoles = ["editor", "viewer"];
    const assignedRole = role && validRoles.includes(role) ? role : "editor";

    const docRef = db.collection("projects").doc(projectId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = doc.data();

    // only owner can add collaborators
    if (project.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: "Only owner can add collaborators" });
    }

    // dont add if already a collaborator or owner
    if (collaboratorId === project.ownerId) {
      return res
        .status(400)
        .json({ error: "Owner doesn't need to be added as collaborator" });
    }

    // backwards compatibility with old projects for testing, once DB is wiped we can remove
    // support for oldformat
    const existingCollaborators = project.collaborators || {};
    const isOldFormat = Array.isArray(existingCollaborators);

    if (isOldFormat) {
      if (existingCollaborators.includes(collaboratorId)) {
        return res
          .status(400)
          .json({ error: "User is already a collaborator" });
      }
    } else {
      if (existingCollaborators[collaboratorId]) {
        return res
          .status(400)
          .json({ error: "User is already a collaborator" });
      }
    }

    // convert old format to new format if needed
    let updatedCollaborators;
    if (isOldFormat) {
      updatedCollaborators = {};
      existingCollaborators.forEach((uid) => {
        updatedCollaborators[uid] = "editor";
      });
      updatedCollaborators[collaboratorId] = assignedRole;
    } else {
      updatedCollaborators = {
        ...existingCollaborators,
        [collaboratorId]: assignedRole,
      };
    }

    await docRef.update({
      collaborators: updatedCollaborators,
      updatedAt: new Date(),
    });

    //
    res.json({ success: true });
    console.log(
      `[API] Added collaborator ${collaboratorId} to project ${projectId}`,
    );
  } catch (error) {
    console.error("[API] Add collaborator error:", error);
    res.status(500).json({ error: "Failed to add collaborator" });
  }
});

// remove collaborator
app.delete(
  "/api/projects/:id/collaborators/:collaboratorId",
  verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.uid;
      const projectId = req.params.id;
      const { collaboratorId } = req.params;

      const docRef = db.collection("projects").doc(projectId);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Project not found" });
      }

      const project = doc.data();

      // only owner can remove collaborators
      if (project.ownerId !== userId) {
        return res
          .status(403)
          .json({ error: "Only owner can remove collaborators" });
      }

      // remove collaborator
      // backwards compatibility, fix later
      //

      const collaborators = project.collaborators || {};
      const isOldFormat = Array.isArray(collaborators);

      let updatedCollaborators;
      if (isOldFormat) {
        updatedCollaborators = collaborators.filter(
          (id) => id !== collaboratorId,
        );
      } else {
        updatedCollaborators = { ...collaborators };
        delete updatedCollaborators[collaboratorId];
      }

      await docRef.update({
        collaborators: updatedCollaborators,
        updatedAt: new Date(),
      });

      res.json({ success: true });
      console.log(
        `[API] Removed collaborator ${collaboratorId} from project ${projectId}`,
      );
    } catch (error) {
      console.error("[API] Remove collaborator error:", error);
      res.status(500).json({ error: "Failed to remove collaborator" });
    }
  },
);

app.post("/api/users/lookup", verifyToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    // look up user by email
    try {
      const userRecord = await adminAuth.getUserByEmail(email);

      res.json({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
      });

      console.log(`[API] Looked up user: ${email} → ${userRecord.uid}`);
    } catch (error) {
      // user not found
      if (error.code === "auth/user-not-found") {
        return res
          .status(404)
          .json({ error: "No user found with that email address" });
      }
      throw error;
    }
  } catch (error) {
    console.error("[API] Lookup user error:", error);
    res.status(500).json({ error: "Failed to lookup user" });
  }
});

app.post("/api/users/lookupByUid", verifyToken, async (req, res) => {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: "UID required" });
    }

    try {
      const userRecord = await adminAuth.getUser(uid);

      res.json({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        photoURL: userRecord.photoURL || null,
      });

      console.log(`[API] Lookup by UID: ${uid} → ${userRecord.email}`);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        return res.status(404).json({ error: "No user found with that UID" });
      }
      throw error;
    }
  } catch (error) {
    console.error("[API] Lookup by UID error:", error);
    res.status(500).json({ error: "Failed to lookup user by UID" });
  }
});

// Helpers
async function checkRoomAccess(roomId, userId) {
  try {
    // find project
    const snapshot = await db
      .collection("projects")
      .where("roomId", "==", roomId)
      .limit(1)
      .get();

    // open room
    if (snapshot.empty) {
      return {
        canAccess: true,
        isPrivate: false,
        role: "guest",
      };
    }

    const projectDoc = snapshot.docs[0];
    const project = projectDoc.data();

    // public
    if (!project.isPrivate) {
      return {
        canAccess: true,
        isPrivate: false,
        role: "guest",
        projectId: projectDoc.id,
      };
    }

    // private
    if (!userId) {
      return {
        canAccess: false,
        isPrivate: true,
        role: null,
        reason: "Authentication required for private rooms",
      };
    }

    const isOwner = project.ownerId === userId;
    const collaboratorRole = project.collaborators?.[userId];
    console.log(collaboratorRole);
    // const isCollaborator = project.collaborators?.includes(userId);

    if (isOwner) {
      return {
        canAccess: true,
        isPrivate: true,
        role: "owner",
        projectId: projectDoc.id,
      };
    }

    if (collaboratorRole) {
      return {
        canAccess: true,
        isPrivate: true,
        role: collaboratorRole,
        projectId: projectDoc.id,
      };
    }

    // no auth
    return {
      canAccess: false,
      isPrivate: true,
      role: null,
      reason: "You don't have permission to access this private room",
    };
  } catch (error) {
    console.error("[Access Check] Error:", error);
    return {
      canAccess: false,
      isPrivate: false,
      role: null,
      reason: "Error checking access",
    };
  }
}

async function getUserDisplayName(userId) {
  // return guest name for anon users
  if (userId.startsWith("user-") || userId.startsWith("anon-")) {
    return `Guest-${userId.slice(-5)}`;
  }

  // if authenticated get email
  try {
    const userRecord = await adminAuth.getUser(userId);
    return userRecord.email || `User-${userId.slice(0, 8)}`;
  } catch (error) {
    console.error(`[DisplayName] Could not fetch user ${userId}:`, error);
    return `User-${userId.slice(0, 8)}`; // default to guest name if fail
  }
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("register-user", async ({ userId, roomId }) => {
    // if no uid, generate one
    const assignedUserId =
      userId || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    socket.data.userId = assignedUserId;
    socket.data.isAuthenticated = userId ? true : false;

    const displayName = await getUserDisplayName(assignedUserId);
    socket.data.displayName = displayName;

    socket.emit("user-registered", { userId: assignedUserId });

    console.log(
      `User registered: ${assignedUserId} (${displayName}) (authenticated: ${socket.data.isAuthenticated})`,
    );
  });

  socket.on("join-room", async (roomId) => {
    // reject if noUID found
    if (!socket.data.userId) {
      console.error("User tried to join room before registering!");
      socket.emit("error", { message: "Must register before joining room" });
      return;
    }

    const userId = socket.data.userId;
    // check if user has access
    const accessCheck = await checkRoomAccess(roomId, userId);

    if (!accessCheck.canAccess) {
      console.log(
        `[Access Denied] User ${userId} tried to join room ${roomId}: ${accessCheck.reason}`,
      );
      socket.emit("room-access-denied", {
        roomId,
        reason: accessCheck.reason,
        isPrivate: accessCheck.isPrivate,
      });
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = accessCheck.role;
    socket.data.projectId = accessCheck.projectId;

    console.log(
      `[Access Granted] User ${userId} (${socket.data.displayName}) (${accessCheck.role}) joined room: ${roomId}`,
    );

    if (!roomUsers[roomId]) roomUsers[roomId] = new Map();
    roomUsers[roomId].set(userId, {
      userId,
      displayName: socket.data.displayName,
      role: accessCheck.role,
      isAuthenticated: socket.data.isAuthenticated,
    });

    // send history to new user
    if (roomHistory[roomId]) {
      socket.emit("history", roomHistory[roomId]);
    }

    // send user list to joining user
    const userList = Array.from(roomUsers[roomId].values());
    socket.emit("room-user-list", userList);

    // notify others
    socket.to(roomId).emit("user-joined", {
      userId,
      displayName: socket.data.displayName,
      role: accessCheck.role,
      isAuthenticated: socket.data.isAuthenticated,
    });

    // send access into to the user
    socket.emit("room-joined", {
      roomId,
      role: accessCheck.role,
      isPrivate: accessCheck.isPrivate,
      projectId: accessCheck.projectId,
    });
  });

  socket.on("draw", ({ roomId, stroke }) => {
    // verify user in room
    if (socket.data.roomId !== roomId) {
      console.error(
        `User ${socket.data.userId} tried to draw in room ${roomId} but is not a member`,
      );
      return;
    }

    // block viewers
    if (socket.data.role === "viewer") {
      console.log(
        `[Draw Blocked] Viewer ${socket.data.userId} attempted to draw`,
      );
      socket.emit("error", { message: "Viewers cannot draw" });
      return;
    }

    if (!roomHistory[roomId]) roomHistory[roomId] = [];
    roomHistory[roomId].push(stroke);

    socket.to(roomId).emit("draw", stroke);
  });

  socket.on("undo", ({ roomId, strokeId }) => {
    // verify user in room
    if (socket.data.roomId !== roomId) {
      return;
    }

    // block viewers
    if (socket.data.role === "viewer") {
      console.log(
        `[Undo Blocked] Viewer ${socket.data.userId} attempted to undo`,
      );
      socket.emit("error", { message: "Viewers cannot undo" });
      return;
    }

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
    const roomId = socket.data.roomId;
    const displayName = socket.data.displayName;
    console.log(
      `User disconnected: ${userId} (${displayName}) from room ${roomId || "none"}`,
    );

    if (roomId && roomUsers[roomId]) {
      roomUsers[roomId].delete(userId);
      socket.to(roomId).emit("user-left", { userId, roomId });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
