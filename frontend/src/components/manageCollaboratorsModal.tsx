import {
  Component,
  createSignal,
  Show,
  For,
  onMount,
  createEffect,
} from "solid-js";
import { useAuth } from "../authContext";
import { projectService, Project } from "../projectService";
import styles from "./manageCollaboratorsModal.module.css";

interface ManageCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
}

interface Collaborator {
  id: string;
  email: string;
  role: "editor" | "viewer";
}

export const ManageCollaboratorsModal: Component<
  ManageCollaboratorsModalProps
> = (props) => {
  const auth = useAuth();
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal<"editor" | "viewer">("editor");
  const [collaborators, setCollaborators] = createSignal<Collaborator[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal("");

  // load collaborators when modal opens
  createEffect(() => {
    if (props.isOpen && props.project) {
      loadCollaborators();
    }
  });

  const loadCollaborators = async () => {
    if (!props.project) return;

    try {
      const token = await auth.getToken();
      if (!token) {
        throw new Error("Failed to get auth token");
      }
      const collabsData = props.project.collaborators || {};

      let entries: [string, "editor" | "viewer"][];
      //! This just handles the old format, defaulting any old collaborators to editors, can be removed later
      if (Array.isArray(collabsData)) {
        entries = collabsData.map((uid) => [uid, "editor" as const]);
      } else {
        entries = Object.entries(collabsData) as [
          string,
          "editor" | "viewer",
        ][];
      }
      const users = await Promise.all(
        entries.map(async ([uid, role]) => {
          try {
            const user = await projectService.lookupUserByUid(token, uid);
            return {
              id: uid,
              email: user.email,
              role: role,
            };
          } catch (err) {
            console.error(`[Collaborators] Error loading user ${uid}:`, err);
            return {
              id: uid,
              email: `User ${uid.substring(0, 8)}...`,
              role: role,
            };
          }
        }),
      );

      setCollaborators(users);
    } catch (err) {
      console.error("[Collaborators] Error loading:", err);
    }
  };

  const handleAddCollaborator = async (e: Event) => {
    e.preventDefault();

    if (!props.project || !auth.user()) {
      return;
    }

    const emailInput = email().trim();
    if (!emailInput) {
      setError("Please enter an email address");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const token = await auth.getToken();
      if (!token) {
        throw new Error("Failed to get auth token");
      }

      // look up by email
      const user = await projectService.lookupUserByEmail(token, emailInput);

      // add using uid
      await projectService.addCollaborator(
        token,
        props.project.id,
        user.uid,
        role(),
      );

      // add to local list with display info
      setCollaborators([
        ...collaborators(),
        {
          id: user.uid,
          email: user.email,
          role: role(),
        },
      ]);

      setEmail("");
      setSuccess(`Added ${user.email} as ${role()}!`);
      setRole("editor"); // reset to default

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("[ManageCollaborators] Error adding:", err);
      setError(err.message || "Failed to add collaborator");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!props.project || !auth.user()) {
      return;
    }

    if (
      !confirm(
        "Remove this collaborator? They will lose access to this project.",
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const token = await auth.getToken();
      if (!token) {
        throw new Error("Failed to get auth token");
      }

      await projectService.removeCollaborator(
        token,
        props.project.id,
        collaboratorId,
      );

      // Remove from local list
      setCollaborators(collaborators().filter((c) => c.id !== collaboratorId));
      setSuccess("Collaborator removed");

      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      console.error("[ManageCollaborators] Error removing:", err);
      setError(err.message || "Failed to remove collaborator");
    }
  };

  const handleClose = () => {
    setEmail("");
    setError("");
    setSuccess("");
    props.onClose();
  };

  return (
    <Show when={props.isOpen && props.project}>
      <div class={styles.overlay} onClick={handleClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button class={styles.closeButton} onClick={handleClose}>
            ✕
          </button>

          <h2>Manage Collaborators</h2>
          <div class={styles.projectName}>
            Project: <strong>{props.project?.name}</strong>
          </div>
          <div class={styles.privacy}>
            {props.project?.isPrivate ? "🔒 Private" : "Public"}
          </div>

          <Show when={error()}>
            <div class={styles.error}>{error()}</div>
          </Show>

          <Show when={success()}>
            <div class={styles.success}>{success()}</div>
          </Show>

          <div class={styles.section}>
            <h3>Current Collaborators</h3>
            <Show
              when={collaborators().length > 0}
              fallback={<p class={styles.emptyState}>No collaborators yet</p>}
            >
              <div class={styles.collaboratorsList}>
                <For each={collaborators()}>
                  {(collab) => (
                    <div class={styles.collaboratorItem}>
                      <div class={styles.collaboratorInfo}>
                        <span class={styles.collaboratorEmail}>
                          {collab.email}
                        </span>
                        <span class={styles.collaboratorId}>{collab.id}</span>
                      </div>
                      <div class={styles.collaboratorActions}>
                        <span class={styles.roleBadge} data-role={collab.role}>
                          {collab.role === "editor" ? "✏️ Editor" : "👁️ Viewer"}
                        </span>

                        <button
                          onClick={() => handleRemoveCollaborator(collab.id)}
                          class={styles.removeButton}
                          title="Remove collaborator"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>

          <div class={styles.section}>
            <h3>Add Collaborator</h3>
            <form onSubmit={handleAddCollaborator} class={styles.form}>
              <div class={styles.formRow}>
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  class={styles.input}
                  disabled={loading()}
                />
                <select
                  value={role()}
                  onChange={(e) =>
                    setRole(e.currentTarget.value as "editor" | "viewer")
                  }
                  class={styles.roleSelect}
                  disabled={loading()}
                >
                  <option value="editor">✏️ Editor</option>
                  <option value="viewer">👁️ Viewer</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading() || !email().trim()}
                class={styles.addButton}
              >
                {loading() ? "Adding..." : "Add Collaborator"}
              </button>
            </form>
            <p class={styles.hint}>
              💡 <strong>Tip:</strong> Editors can draw and save. Viewers can
              only watch.
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
};
