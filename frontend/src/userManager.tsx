const USER_ID_KEY = "sketchpad_user_id";

export class UserManager {
  private userId: string | null = null;

  constructor() {
    this.loadUserId();
  }

  // load userId from localStorage if it exists
  private loadUserId(): void {
    try {
      this.userId = localStorage.getItem(USER_ID_KEY);
    } catch (e) {
      console.warn("Could not access localStorage:", e);
    }
  }

  public getUserId(): string | null {
    return this.userId;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
    try {
      localStorage.setItem(USER_ID_KEY, userId);
      console.log("User ID saved to localStorage:", userId);
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  public hasUserId(): boolean {
    return this.userId !== null && this.userId.length > 0;
  }

  public clearUserId(): void {
    this.userId = null;
    try {
      localStorage.removeItem(USER_ID_KEY);
      console.log("User ID cleared from localStorage");
    } catch (e) {
      console.warn("Could not clear localStorage:", e);
    }
  }
}

// singleton instance
export const userManager = new UserManager();
