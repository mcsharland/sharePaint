import { Component, createSignal, Show, For, createEffect } from "solid-js";
import { useAuth } from "../authContext";
import { projectService, Project } from "../projectService";
import type { Sketchpad } from "./sketchpad";
import styles from "./projectsModal.module.css";

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sketchpad?: Sketchpad;
}

export const ProjectsModal: Component<ProjectsModalProps> = (props) => {
  const auth = useAuth();
  const [projects, setProjects] = createSignal<Project[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const loadProjects = async () => {
    if (!auth.user()) return;

    setLoading(true);
    setError("");

    try {
      const token = await auth.getToken();
      if (!token) throw new Error("Failed to get auth token");

      const fetchedProjects = await projectService.getProjects(token);
      setProjects(fetchedProjects);
    } catch (err: any) {
      console.error("[Projects] Error loading:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadProject = async (project: Project) => {
    if (!props.sketchpad) return;

    try {
      // clear existing strokes
      props.sketchpad.getStrokes().forEach((stroke) => {
        props.sketchpad!.removeStroke(stroke.id);
      });

      // add new project strokes
      project.strokes.forEach((stroke) => {
        props.sketchpad!.addExternalStroke(stroke);
      });

      console.log(`[Projects] Loaded project: ${project.name}`);
      props.onClose();
    } catch (err) {
      console.error("[Projects] Error loading project:", err);
      setError("Failed to load project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const token = await auth.getToken();
      if (!token) throw new Error("Failed to get auth token");

      await projectService.deleteProject(token, projectId);

      // update optimistically
      setProjects(projects().filter((p) => p.id !== projectId));
      console.log(`[Projects] Deleted project: ${projectId}`);
    } catch (err: any) {
      console.error("[Projects] Error deleting:", err);
      setError(err.message || "Failed to delete project");
    }
  };

  // run on modal open
  createEffect(() => {
    if (props.isOpen) {
      loadProjects();
    }
  });

  return (
    <Show when={props.isOpen}>
      <div class={styles.overlay} onClick={props.onClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button class={styles.closeButton} onClick={props.onClose}>
            ✕
          </button>

          <h2>My Projects</h2>

          <Show when={error()}>
            <div class={styles.error}>{error()}</div>
          </Show>

          <Show when={loading()}>
            <div class={styles.loading}>Loading projects...</div>
          </Show>

          <Show when={!loading() && projects().length === 0}>
            <div class={styles.empty}>
              No saved projects yet. Create a drawing and click Save!
            </div>
          </Show>

          <Show when={!loading() && projects().length > 0}>
            <div class={styles.projectsList}>
              <For each={projects()}>
                {(project) => (
                  <div class={styles.projectItem}>
                    <div class={styles.projectInfo}>
                      <div class={styles.projectName}>{project.name}</div>
                      <div class={styles.projectDate}>
                        {(() => {
                          // convert firestore timestamp to date
                          const ts = project.updatedAt as any;
                          if (!ts) return "—";
                          if ("_seconds" in ts) {
                            return new Date(
                              ts._seconds * 1000,
                            ).toLocaleDateString();
                          }
                          return new Date(ts).toLocaleDateString();
                        })()}{" "}
                      </div>
                    </div>
                    <div class={styles.projectActions}>
                      <button
                        onClick={() => handleLoadProject(project)}
                        class={styles.loadButton}
                        title="Load Project"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        class={styles.deleteButton}
                        title="Delete Project"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  );
};
