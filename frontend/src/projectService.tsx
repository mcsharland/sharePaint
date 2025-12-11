import { Stroke } from "./components/sketchpad";

// CHANGE LATER
const API_URL = "http://localhost:3001";

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  collaborators: { [uid: string]: "editor" | "viewer" };
  isPrivate: boolean;
  strokes: Stroke[];
  roomId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  isOwner?: boolean;
  userRole?: "editor" | "viewer";
}

export class ProjectService {
  private getAuthHeaders(token: string) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async saveProject(
    token: string,
    name: string,
    strokes: Stroke[],
    roomId?: string,
    isPrivate?: boolean,
  ): Promise<Project> {
    const response = await fetch(`${API_URL}/api/projects`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ name, strokes, roomId, isPrivate }),
    });

    if (!response.ok) {
      throw new Error("Failed to save project");
    }

    return await response.json();
  }

  async getProjects(token: string): Promise<Project[]> {
    const response = await fetch(`${API_URL}/api/projects`, {
      method: "GET",
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch projects");
    }

    const data = await response.json();
    return data.projects;
  }

  async getProject(token: string, projectId: string): Promise<Project> {
    const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
      method: "GET",
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch project");
    }

    return await response.json();
  }

  async updateProject(
    token: string,
    projectId: string,
    updates: { name?: string; strokes?: Stroke[] },
  ): Promise<Project> {
    const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error("Failed to update project");
    }

    return await response.json();
  }

  async deleteProject(token: string, projectId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error("Failed to delete project");
    }
  }
  async addCollaborator(
    token: string,
    projectId: string,
    collaboratorId: string,
    role: "editor" | "viewer" = "editor",
  ): Promise<void> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/collaborators`,
      {
        method: "POST",
        headers: this.getAuthHeaders(token),
        body: JSON.stringify({ collaboratorId, role }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add collaborator");
    }

    console.log(
      `[ProjectService] Added collaborator ${collaboratorId} as ${role} to project ${projectId}`,
    );
  }

  async removeCollaborator(
    token: string,
    projectId: string,
    collaboratorId: string,
  ): Promise<void> {
    const response = await fetch(
      `${API_URL}/api/projects/${projectId}/collaborators/${collaboratorId}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(token),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove collaborator");
    }

    console.log(
      `[ProjectService] Removed collaborator from project ${projectId}`,
    );
  }
  async lookupUserByEmail(
    token: string,
    email: string,
  ): Promise<{ uid: string; email: string; displayName: string | null }> {
    const response = await fetch(`${API_URL}/api/users/lookup`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to lookup user");
    }

    return await response.json();
  }

  async lookupUserByUid(
    token: string,
    uid: string,
  ): Promise<{ uid: string; email: string; displayName: string | null }> {
    const response = await fetch(`${API_URL}/api/users/lookupByUid`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ uid }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to lookup user");
    }
    return await response.json();
  }
}

export const projectService = new ProjectService();
