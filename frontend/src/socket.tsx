import { io, Socket } from "socket.io-client";
import { userManager } from "./userManager";

const SERVER_URL = "http://localhost:3001";

export const socket: Socket = io(SERVER_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

// handle registration on connection
socket.on("connect", () => {
  console.log("Connected to server, registering user...");

  // send existing if found, otherwise server will generate one
  const existingUserId = userManager.getUserId();
  const roomId = new URLSearchParams(window.location.search).get("room");

  socket.emit("register-user", {
    userId: existingUserId,
    roomId: roomId,
  });
});

socket.on("user-registered", ({ userId }: { userId: string }) => {
  console.log("User registered with ID:", userId);
  userManager.setUserId(userId);
});

export { userManager };
