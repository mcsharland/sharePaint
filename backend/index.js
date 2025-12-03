import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // changeme
    methods: ["GET", "POST"],
  },
});

const roomHistory = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // send history to new user
    if (roomHistory[roomId]) {
      socket.emit("history", roomHistory[roomId]);
    }
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
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
