import { Component, createEffect, onCleanup } from "solid-js";
import { Sketchpad, Stroke } from "./components/sketchpad";
import { socket } from "./socket";

interface RoomManagerProps {
  sketchpad?: Sketchpad;
}

export const RoomManager: Component<RoomManagerProps> = (props) => {
  createEffect(() => {
    if (!props.sketchpad) return;

    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room");

    console.log(`[RoomManager] Joining room: ${roomId}`);

    if (!socket.connected) socket.connect();
    socket.emit("join-room", roomId);

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

    socket.on("history", handleHistory);
    socket.on("draw", handleDraw);
    socket.on("undo", handleUndo);

    // broadcast
    props.sketchpad.setBroadcastCallback(
      (stroke: Stroke) => {
        socket.emit("draw", { roomId, stroke });
      },
      (strokeId: string) => {
        socket.emit("undo", { roomId, strokeId });
      },
    );

    onCleanup(() => {
      socket.off("history", handleHistory);
      socket.off("draw", handleDraw);
      // socket.disconnect();
      // dont disconnect socket to switch rooms more easily
    });
  });

  return null;
};
