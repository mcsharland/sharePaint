export type ToolType = "brush" | "line" | "eraser";

export interface SketchpadOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  tool?: ToolType;
  userId?: string;
  onStroke?: (stroke: Stroke) => void; // stroke callback
  onUndo?: (strokeId: string) => void;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  userId: string;
  type: ToolType;
  points: Point[];
  color: string;
  width: number;
  isEraser?: boolean;
}

export class Sketchpad {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private tool: ToolType;
  private userId: string;
  private isDrawing: boolean = false;
  private lineStartPoint: Point | null = null;

  private strokes: Stroke[] = [];
  private redoStack: Stroke[] = [];
  private currentStroke: Stroke | null = null;

  private options: Required<SketchpadOptions>;

  constructor(container: HTMLElement, options?: SketchpadOptions) {
    this.container = container;

    this.options = {
      width: options?.width ?? container.clientWidth,
      height: options?.height ?? container.clientHeight,
      backgroundColor: options?.backgroundColor ?? "#ffffff",
      strokeColor: options?.strokeColor ?? "#000000",
      lineWidth: options?.lineWidth ?? 2,
      tool: options?.tool ?? "brush",
      userId:
        options?.userId ?? `user-${Math.random().toString(36).substr(2, 9)}`,
      onStroke: options?.onStroke ?? (() => {}),
      onUndo: options?.onUndo ?? (() => {}),
    };

    this.tool = this.options.tool;
    this.userId = this.options.userId;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none"; // prevent scroll on touch devices

    this.container.appendChild(this.canvas);

    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get CanvasRenderingContext2D");
    }
    this.ctx = context;

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);

    this.resetCanvas();
    this.bindEvents();
  }

  // network api
  public setBroadcastCallback(
    onStroke: (stroke: Stroke) => void,
    onUndo: (id: string) => void,
  ) {
    this.options.onStroke = onStroke;
    this.options.onUndo = onUndo;
  }

  public addExternalStroke(stroke: Stroke): void {
    // avoid dupes
    if (this.strokes.some((s) => s.id === stroke.id)) return;
    this.strokes.push(stroke);
    this.redraw();
  }

  public removeStroke(strokeId: string): void {
    const index = this.strokes.findIndex((s) => s.id === strokeId);
    if (index !== -1) {
      this.strokes.splice(index, 1);
      this.redraw();
    }
  }

  // api

  public setTool(tool: ToolType): void {
    this.tool = tool;
    this.lineStartPoint = null;
    this.isDrawing = false;
    this.redraw();
  }

  public setLineSize(size: number): void {
    this.options.lineWidth = size;
  }

  public setStrokeColor(color: string): void {
    this.options.strokeColor = color;
  }

  public exportImage(type: "image/png" | "image/jpeg" = "image/png"): string {
    return this.canvas.toDataURL(type);
  }

  public undo(): void {
    let indexToRemove = -1;

    for (let i = this.strokes.length - 1; i >= 0; i--) {
      if (this.strokes[i].userId === this.userId) {
        indexToRemove = i;
        break;
      }
    }

    if (indexToRemove !== -1) {
      const stroke = this.strokes.splice(indexToRemove, 1)[0];
      this.redoStack.push(stroke);
      this.redraw();

      // broadcast undo
      this.options.onUndo(stroke.id);
    }
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    const stroke = this.redoStack.pop();
    if (stroke) {
      this.strokes.push(stroke);
      this.redraw();
      // treat as new stroke
      this.options.onStroke(stroke);
    }
  }

  public getStrokes(): Stroke[] {
    return this.strokes;
  }

  public dispose(): void {
    this.unbindEvents();
    this.canvas.remove();
  }

  // rendering
  private resetCanvas(): void {
    this.ctx.fillStyle = this.options.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private redraw(): void {
    this.resetCanvas();
    this.strokes.forEach((stroke) => this.drawStrokePath(stroke));
  }

  private drawStrokePath(stroke: Stroke): void {
    if (stroke.points.length === 0) return;

    this.ctx.beginPath();

    if (stroke.isEraser) {
      this.ctx.strokeStyle = this.options.backgroundColor;
    } else {
      this.ctx.strokeStyle = stroke.color;
    }

    this.ctx.lineWidth = stroke.width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";

    const start = this.denormalizePoint(stroke.points[0]);
    this.ctx.moveTo(start.x, start.y);

    for (let i = 1; i < stroke.points.length; i++) {
      const p = this.denormalizePoint(stroke.points[i]);
      this.ctx.lineTo(p.x, p.y);
    }
    this.ctx.stroke();
  }

  private bindEvents(): void {
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);
  }

  private unbindEvents(): void {
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
  }

  // handlers
  private handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    this.isDrawing = false;
    this.currentStroke = null;
    this.lineStartPoint = null;
    this.redraw();
  }

  private handleMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    if (this.redoStack.length > 0) this.redoStack = [];

    const p = this.getPointerPos(e);
    const normP = this.normalizePoint(p);

    if (this.tool === "brush" || this.tool === "eraser") {
      this.startFreehandStroke(p, normP);
    } else if (this.tool === "line") {
      this.handleLineClick(normP);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const p = this.getPointerPos(e);
    const normP = this.normalizePoint(p);

    if (this.tool === "brush" || this.tool === "eraser") {
      this.continueFreehandStroke(p, normP);
    } else if (this.tool === "line") {
      this.updateLinePreview(normP);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.tool !== "line") this.endFreehandStroke();
  }

  private handleMouseLeave(e: MouseEvent): void {
    if (this.tool !== "line") this.endFreehandStroke();
  }

  // draw
  private startFreehandStroke(p: Point, normP: Point): void {
    this.isDrawing = true;
    const isEraser = this.tool === "eraser";

    this.currentStroke = {
      id: crypto.randomUUID(),
      userId: this.userId,
      type: this.tool,
      isEraser: isEraser,
      color: this.options.strokeColor,
      width: isEraser ? this.options.lineWidth * 5 : this.options.lineWidth, // eraser is larger, maybe change later
      points: [normP],
    };

    this.ctx.beginPath();
    this.ctx.strokeStyle = isEraser
      ? this.options.backgroundColor
      : this.options.strokeColor;
    this.ctx.lineWidth = this.currentStroke.width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.moveTo(p.x, p.y);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
  }

  private continueFreehandStroke(p: Point, normP: Point): void {
    if (!this.isDrawing || !this.currentStroke) return;
    this.currentStroke.points.push(normP);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
  }

  private endFreehandStroke(): void {
    if (this.isDrawing && this.currentStroke) {
      this.isDrawing = false;
      this.ctx.closePath();
      if (this.currentStroke.points.length > 0) {
        this.strokes.push(this.currentStroke);
        this.options.onStroke(this.currentStroke); // emit stroke
      }
      this.currentStroke = null;
    }
  }

  private handleLineClick(normP: Point): void {
    if (!this.lineStartPoint) {
      this.lineStartPoint = normP;
    } else {
      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        userId: this.userId,
        type: "line",
        color: this.options.strokeColor,
        width: this.options.lineWidth,
        points: [this.lineStartPoint, normP],
      };

      this.strokes.push(newStroke);
      this.lineStartPoint = null;
      this.redraw();
      this.options.onStroke(newStroke); // emit stroke
    }
  }

  private updateLinePreview(normP: Point): void {
    if (!this.lineStartPoint) return;
    this.redraw();

    const start = this.denormalizePoint(this.lineStartPoint);
    const end = this.denormalizePoint(normP);

    this.ctx.beginPath();
    this.ctx.strokeStyle = this.options.strokeColor;
    this.ctx.lineWidth = this.options.lineWidth;
    this.ctx.lineCap = "round";
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }

  private getPointerPos(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private normalizePoint(p: Point): Point {
    return { x: p.x / this.canvas.width, y: p.y / this.canvas.height };
  }

  private denormalizePoint(p: Point): Point {
    return { x: p.x * this.canvas.width, y: p.y * this.canvas.height };
  }
}
