import { Component, createSignal, onCleanup, For, Show } from "solid-js";
import { socket } from "../socket";
import styles from "./connectedUsers.module.css";

interface User {
  userId: string;
  displayName: string;
  role: string;
  isAuthenticated: boolean;
}

export const ConnectedUsers: Component = () => {
  const [users, setUsers] = createSignal<User[]>([]);
  const [isExpanded, setIsExpanded] = createSignal(false);

  // listen for updates
  const handleUserList = (userList: User[]) => {
    console.log("[ConnectedUsers] User list updated:", userList);
    setUsers(userList);
  };

  const handleUserJoined = (data: {
    userId: string;
    displayName: string;
    role: string;
    isAuthenticated: boolean;
  }) => {
    console.log("[ConnectedUsers] User joined:", data);
    setUsers((prev) => {
      // Don't add duplicates
      if (prev.some((u) => u.userId === data.userId)) return prev;
      return [...prev, data];
    });
  };

  const handleUserLeft = (data: { userId: string }) => {
    console.log("[ConnectedUsers] User left:", data.userId);
    setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
  };

  socket.on("room-user-list", handleUserList);
  socket.on("user-joined", handleUserJoined);
  socket.on("user-left", handleUserLeft);

  onCleanup(() => {
    socket.off("room-user-list", handleUserList);
    socket.off("user-joined", handleUserJoined);
    socket.off("user-left", handleUserLeft);
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "owner":
        return "#4285f4";
      case "collaborator":
        return "#34a853";
      case "viewer":
        return "#fbbc04";
      default:
        return "#999";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Owner";
      case "collaborator":
        return "Editor";
      case "viewer":
        return "Viewer";
      default:
        return "Guest";
    }
  };

  return (
    <div class={styles.container}>
      <button
        class={styles.toggle}
        onClick={() => setIsExpanded(!isExpanded())}
        title="Connected Users"
      >
        👥 {users().length}
      </button>

      <Show when={isExpanded()}>
        <div class={styles.panel}>
          <div class={styles.header}>
            <h3>Connected Users</h3>
            <button
              class={styles.closeButton}
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </button>
          </div>

          <Show
            when={users().length > 0}
            fallback={<div class={styles.empty}>No users connected</div>}
          >
            <div class={styles.userList}>
              <For each={users()}>
                {(user) => (
                  <div class={styles.userItem}>
                    <div class={styles.userAvatar}>
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div class={styles.userInfo}>
                      <div class={styles.userName}>{user.displayName}</div>
                      <div
                        class={styles.userRole}
                        style={{ color: getRoleColor(user.role) }}
                      >
                        {getRoleLabel(user.role)}
                      </div>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
};
