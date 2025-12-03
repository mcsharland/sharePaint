import { Component, createSignal, Show } from "solid-js";
import { useAuth } from "../authContext";
import { SaveProjectModal } from "./saveProjectModal";
import { ProjectsModal } from "./projectsModal";
import { Sketchpad } from "./sketchpad";
import toolbarStyles from "./toolbar.module.css";
import styles from "./projects.module.css";

interface ProjectsProps {
  sketchpad?: Sketchpad;
}

export const Projects: Component<ProjectsProps> = (props) => {
  const auth = useAuth();
  const [showSaveModal, setShowSaveModal] = createSignal(false);
  const [showProjectsModal, setShowProjectsModal] = createSignal(false);

  return (
    <>
      <Show when={auth.user()}>
        <div class={toolbarStyles["ribbon-group"]}>
          <div class={toolbarStyles["ribbon-group-content"]}>
            <button
              onClick={() => setShowSaveModal(true)}
              title="Save Project"
              class={styles["save-button"]}
            >
              💾 Save
            </button>
            <button
              onClick={() => setShowProjectsModal(true)}
              title="My Projects"
              class={styles["projects-button"]}
            >
              📁 Projects
            </button>
          </div>
          <div class={toolbarStyles["ribbon-group-label"]}>Projects</div>
        </div>
      </Show>

      <SaveProjectModal
        isOpen={showSaveModal()}
        onClose={() => setShowSaveModal(false)}
        sketchpad={props.sketchpad}
      />

      <ProjectsModal
        isOpen={showProjectsModal()}
        onClose={() => setShowProjectsModal(false)}
        sketchpad={props.sketchpad}
      />
    </>
  );
};
