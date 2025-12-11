import { Component, createEffect, onCleanup, createSignal } from "solid-js";
import { Sketchpad, Stroke } from "./components/sketchpad";
import { socket } from "./socket";

interface RoomManagerProps {
  sketchpad?: Sketchpad;
  onViewerStatusChange?: (isViewer: boolean) => void;
}

export const RoomManager: Component<RoomManagerProps> = (props) => {
  const [accessDenied, setAccessDenied] = createSignal<string | null>(null);
  const [userRole, setUserRole] = createSignal<string | null>(null);
  createEffect(() => {
    if (!props.sketchpad) return;

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room");

    console.log(`[RoomManager] Preparing to join room: ${roomId}`);

    const handleUserRegistered = () => {
      console.log(`[RoomManager] User registered, now joining room: ${roomId}`);
      socket.emit("join-room", roomId);
      // remove listener after joining once
      socket.off("user-registered", handleUserRegistered);
    };

    if (socket.connected && socket.id) {
      socket.once("user-registered", handleUserRegistered);

      setTimeout(() => socket.emit("join-room", roomId), 100);
    } else {
      // wait for registration
      socket.once("user-registered", handleUserRegistered);
    }

    const handleRoomJoined = (data: {
      roomId: string;
      role: string;
      isPrivate: boolean;
      projectId?: string;
    }) => {
      console.log(`[RoomManager] Successfully joined room as ${data.role}`);
      if (data.isPrivate) {
        console.log(
          `[RoomManager] This is a private room linked to project ${data.projectId}`,
        );
      }
      setAccessDenied(null);
      setUserRole(data.role);

      const isViewer = data.role === "viewer";
      props.sketchpad?.setViewerMode(isViewer);
      props.onViewerStatusChange?.(isViewer);

      // test
      if (isViewer) {
        console.log("[RoomManager] Viewer mode enabled - drawing disabled");
      }
    };

    const handleAccessDenied = (data: {
      roomId: string;
      reason: string;
      isPrivate: boolean;
    }) => {
      console.error(
        `[RoomManager] Access denied to room ${data.roomId}: ${data.reason}`,
      );
      setAccessDenied(data.reason);
      props.onViewerStatusChange?.(false); // consider making true to hard disable tools? left on false for error testing viewers

      // show alert
      alert(`Cannot join room: ${data.reason}`);

      // consider redict to error page / new canvas
      // window.location.href = "/";
    };

    // load canvas
    const handleHistory = (strokes: Stroke[]) => {
      strokes.forEach((s) => props.sketchpad?.addExternalStroke(s));
    };

    const handleDraw = (stroke: Stroke) => {
      props.sketchpad?.addExternalStroke(stroke);
    };

    const handleUndo = (strokeId: string) => {
      props.sketchpad?.removeStroke(strokeId);
    };

    const handleUserJoined = (data: {
      userId: string;
      roomId: string;
      role?: string;
    }) => {
      console.log(
        `[RoomManager] User ${data.userId} joined as ${data.role || "guest"}`,
      );
    };

    const handleUserLeft = (data: { userId: string; roomId: string }) => {
      console.log(`[RoomManager] User ${data.userId} left`);
    };

    const handleError = (data: { message: string }) => {
      console.error(`[RoomManager] Error from server: ${data.message}`);
      // tesing
      if (data.message.includes("Viewer")) {
        alert(data.message);
      }
    };

    socket.on("room-joined", handleRoomJoined);
    socket.on("room-access-denied", handleAccessDenied);
    socket.on("history", handleHistory);
    socket.on("draw", handleDraw);
    socket.on("undo", handleUndo);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-left", handleUserLeft);
    socket.on("error", handleError);

    // broadcast
    props.sketchpad.setBroadcastCallback(
      (stroke: Stroke) => {
        if (accessDenied()) {
          console.warn("[RoomManager] Cannot draw - access denied");
          return;
        }
        if (userRole() === "viewer") {
          console.warn("[RoomManager] Cannot draw - viewer mode");
          return;
        }
        socket.emit("draw", { roomId, stroke });
      },
      (strokeId: string) => {
        if (accessDenied()) {
          console.warn("[RoomManager] Cannot undo - access denied");
          return;
        }
        if (userRole() === "viewer") {
          console.warn("[RoomManager] Cannot undo - viewer mode");
          return;
        }
        socket.emit("undo", { roomId, strokeId });
      },
    );

    onCleanup(() => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("room-access-denied", handleAccessDenied);
      socket.off("history", handleHistory);
      socket.off("draw", handleDraw);
      socket.off("undo", handleUndo);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-left", handleUserLeft);
      socket.off("error", handleError);
      socket.off("user-registered", handleUserRegistered);
      // socket.disconnect();
      // dont disconnect socket to switch rooms more easily
    });
  });

  return null;
};
