export type ToolType =
  | "brush"
  | "line"
  | "eraser"
  | "eyedropper"
  | "rectangle"
  | "circle"
  | "text";

export interface SketchpadOptions {
  width?: number;
  height?: number;
  backgroundColor?: string;
  strokeColor?: string;
  lineWidth?: number;
  tool?: ToolType;
  userId?: string;
  isViewerMode?: boolean;
  fillShapes?: boolean;
  onStroke?: (stroke: Stroke) => void; // stroke callback
  onUndo?: (strokeId: string) => void;
  onColorPick?: (color: string) => void;
  onTextRequest?: (point: Point) => void;
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
  filled?: boolean;
  text?: string;
}

export class Sketchpad {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private userId: string;
  private isViewerMode: boolean = false;
  private isDrawing: boolean = false;
  private shapeStartPoint: Point | null = null;

  private strokes: Stroke[] = [];
  private redoStack: Stroke[] = [];
  private currentStroke: Stroke | null = null;

  private options: Required<SketchpadOptions>;

  public tool: ToolType;

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
      isViewerMode: options?.isViewerMode ?? false,
      fillShapes: options?.fillShapes ?? false,
      onStroke: options?.onStroke ?? (() => {}),
      onUndo: options?.onUndo ?? (() => {}),
      onColorPick: options?.onColorPick ?? (() => {}),
      onTextRequest: options?.onTextRequest ?? (() => {}),
    };

    this.tool = this.options.tool;
    this.userId = this.options.userId;
    this.isViewerMode = this.options.isViewerMode;

    this.canvas = document.createElement("canvas");
    this.canvas.width = this.options.width;
    this.canvas.height = this.options.height;
    this.canvas.style.display = "block";
    this.canvas.style.touchAction = "none"; // prevent scroll on touch devices

    if (this.isViewerMode) {
      // visual indicator of viewer mode
      this.canvas.style.cursor = "default";
    }

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

  public setViewerMode(isViewer: boolean): void {
    this.isViewerMode = isViewer;
    this.canvas.style.cursor = isViewer ? "default" : "crosshair";
  }

  public isViewer(): boolean {
    return this.isViewerMode;
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
    this.shapeStartPoint = null;
    this.isDrawing = false;
    this.redraw();
  }

  public setFillShapes(fill: boolean): void {
    this.options.fillShapes = fill;
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
    if (this.isViewerMode) return;
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
    if (this.isViewerMode) return;
    if (this.redoStack.length === 0) return;
    const stroke = this.redoStack.pop();
    if (stroke) {
      this.strokes.push(stroke);
      this.redraw();
      // treat as new stroke
      this.options.onStroke(stroke);
    }
  }

  public clear(): void {
    if (this.isViewerMode) return;
    this.strokes = [];
    this.redoStack = [];
    this.redraw();
  }

  public getStrokes(): Stroke[] {
    return this.strokes;
  }

  public resize(width: number, height: number): void {
    const oldWidth = this.canvas.width;
    const oldHeight = this.canvas.height;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.options.width = width;
    this.options.height = height;

    this.redraw();
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
    this.strokes.forEach((stroke) => {
      if (stroke.type === "rectangle") {
        this.drawRectangle(stroke);
      } else if (stroke.type === "circle") {
        this.drawCircle(stroke);
      } else if (stroke.type === "text") {
        this.drawText(stroke);
      } else {
        this.drawStrokePath(stroke);
      }
    });
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

  private drawRectangle(stroke: Stroke): void {
    if (stroke.points.length !== 2) return;

    const start = this.denormalizePoint(stroke.points[0]);
    const end = this.denormalizePoint(stroke.points[1]);

    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const width = Math.abs(end.x - start.x);
    const height = Math.abs(end.y - start.y);

    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;

    if (stroke.filled) {
      this.ctx.fillStyle = stroke.color;
      this.ctx.fillRect(x, y, width, height);
    } else {
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  private drawCircle(stroke: Stroke): void {
    if (stroke.points.length !== 2) return;

    const center = this.denormalizePoint(stroke.points[0]);
    const edge = this.denormalizePoint(stroke.points[1]);

    const radius = Math.sqrt(
      Math.pow(edge.x - center.x, 2) + Math.pow(edge.y - center.y, 2),
    );

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI);

    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width;

    if (stroke.filled) {
      this.ctx.fillStyle = stroke.color;
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  private drawText(stroke: Stroke): void {
    if (stroke.points.length === 0 || !stroke.text) return;

    const pos = this.denormalizePoint(stroke.points[0]);

    this.ctx.font = `${stroke.width * 10}px sans-serif`; // scale font size with line width for now
    this.ctx.fillStyle = stroke.color;
    this.ctx.textBaseline = "top";
    this.ctx.fillText(stroke.text, pos.x, pos.y);
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
    this.shapeStartPoint = null;
    this.redraw();
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.isViewerMode) return;
    if (e.button !== 0) return;
    if (this.redoStack.length > 0) this.redoStack = [];

    const p = this.getPointerPos(e);
    const normP = this.normalizePoint(p);

    if (this.tool === "brush" || this.tool === "eraser") {
      this.startFreehandStroke(p, normP);
    } else if (
      this.tool === "line" ||
      this.tool === "rectangle" ||
      this.tool === "circle"
    ) {
      this.handleShapeClick(normP);
    } else if (this.tool === "eyedropper") {
      this.pickColor(p);
    } else if (this.tool === "text") {
      this.handleTextClick(normP);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isViewerMode) return;
    const p = this.getPointerPos(e);
    const normP = this.normalizePoint(p);

    if (this.tool === "brush" || this.tool === "eraser") {
      this.continueFreehandStroke(p, normP);
    } else if (
      this.tool === "line" ||
      this.tool === "rectangle" ||
      this.tool === "circle"
    ) {
      this.updateShapePreview(normP);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (
      this.tool !== "line" &&
      this.tool !== "rectangle" &&
      this.tool !== "circle"
    ) {
      this.endFreehandStroke();
    }
  }

  private handleMouseLeave(e: MouseEvent): void {
    if (
      this.tool !== "line" &&
      this.tool !== "rectangle" &&
      this.tool !== "circle"
    ) {
      this.endFreehandStroke();
    }
  }

  private pickColor(p: Point): void {
    // get pixel at the clicked
    const imageData = this.ctx.getImageData(
      Math.floor(p.x),
      Math.floor(p.y),
      1,
      1,
    );
    const pixel = imageData.data;

    //RGB to hex
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

    // update stroke color
    this.options.strokeColor = hex;

    // notify parent component (so color picker UI updates)
    this.options.onColorPick(hex);

    this.setTool("brush");
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

  private handleShapeClick(normP: Point): void {
    if (!this.shapeStartPoint) {
      this.shapeStartPoint = normP;
    } else {
      const newStroke: Stroke = {
        id: crypto.randomUUID(),
        userId: this.userId,
        type: this.tool,
        color: this.options.strokeColor,
        width: this.options.lineWidth,
        points: [this.shapeStartPoint, normP],
        filled: this.options.fillShapes,
      };

      this.strokes.push(newStroke);
      this.shapeStartPoint = null;
      this.redraw();
      this.options.onStroke(newStroke);
    }
  }

  // private handleLineClick(normP: Point): void {
  //   if (!this.shapeStartPoint) {
  //     this.shapeStartPoint = normP;
  //   } else {
  //     const newStroke: Stroke = {
  //       id: crypto.randomUUID(),
  //       userId: this.userId,
  //       type: "line",
  //       color: this.options.strokeColor,
  //       width: this.options.lineWidth,
  //       points: [this.shapeStartPoint, normP],
  //     };

  //     this.strokes.push(newStroke);
  //     this.shapeStartPoint = null;
  //     this.redraw();
  //     this.options.onStroke(newStroke); // emit stroke
  //   }
  // }

  private updateShapePreview(normP: Point): void {
    if (!this.shapeStartPoint) return;
    this.redraw();

    const start = this.denormalizePoint(this.shapeStartPoint);
    const end = this.denormalizePoint(normP);

    this.ctx.strokeStyle = this.options.strokeColor;
    this.ctx.lineWidth = this.options.lineWidth;

    if (this.tool === "line") {
      this.ctx.beginPath();
      this.ctx.lineCap = "round";
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
      this.ctx.stroke();
    } else if (this.tool === "rectangle") {
      const x = Math.min(start.x, end.x);
      const y = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x);
      const height = Math.abs(end.y - start.y);

      if (this.options.fillShapes) {
        this.ctx.fillStyle = this.options.strokeColor;
        this.ctx.fillRect(x, y, width, height);
      } else {
        this.ctx.strokeRect(x, y, width, height);
      }
    } else if (this.tool === "circle") {
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
      );

      this.ctx.beginPath();
      this.ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);

      if (this.options.fillShapes) {
        this.ctx.fillStyle = this.options.strokeColor;
        this.ctx.fill();
      } else {
        this.ctx.stroke();
      }
    }
  }

  // private updateLinePreview(normP: Point): void {
  //   if (!this.shapeStartPoint) return;
  //   this.redraw();

  //   const start = this.denormalizePoint(this.shapeStartPoint);
  //   const end = this.denormalizePoint(normP);

  //   this.ctx.beginPath();
  //   this.ctx.strokeStyle = this.options.strokeColor;
  //   this.ctx.lineWidth = this.options.lineWidth;
  //   this.ctx.lineCap = "round";
  //   this.ctx.moveTo(start.x, start.y);
  //   this.ctx.lineTo(end.x, end.y);
  //   this.ctx.stroke();
  // }

  private handleTextClick(normP: Point): void {
    // trigger callback to app/ui to show text input modal
    const denormP = this.denormalizePoint(normP);
    this.options.onTextRequest(normP);
  }

  public addTextStroke(text: string, normPoint: Point): void {
    if (!text.trim()) return;

    const textStroke: Stroke = {
      id: crypto.randomUUID(),
      userId: this.userId,
      type: "text",
      color: this.options.strokeColor,
      width: this.options.lineWidth,
      points: [normPoint],
      text: text,
    };

    this.strokes.push(textStroke);
    this.redraw();
    this.options.onStroke(textStroke);
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
