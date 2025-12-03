import { Stroke } from "./components/sketchpad";

// CHANGE LATER
const API_URL = "http://localhost:3001";

export interface Project {
  id: string;
  name: string;
  userId: string;
  strokes: Stroke[];
  roomId?: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  ): Promise<Project> {
    const response = await fetch(`${API_URL}/api/projects`, {
      method: "POST",
      headers: this.getAuthHeaders(token),
      body: JSON.stringify({ name, strokes, roomId }),
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
}

export const projectService = new ProjectService();
