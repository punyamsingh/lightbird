import { compile, type CompiledASS, type Dialogue, type CompiledASSStyle } from 'ass-compiler';

/** Converts an ASS color hex string like "AABBGGRR" to a CSS rgba() string. */
function assColorToCss(color: string, alphaHex: string): string {
  // ASS color format is &HAABBGGRR (alpha, blue, green, red)
  const hex = color.replace('&H', '').padStart(8, '0');
  const a = parseInt(hex.slice(0, 2), 16);
  const b = parseInt(hex.slice(2, 4), 16);
  const g = parseInt(hex.slice(4, 6), 16);
  const r = parseInt(hex.slice(6, 8), 16);
  // ASS alpha: 0 = fully opaque, 255 = fully transparent
  const alpha = 1 - a / 255;
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

/** Maps ASS alignment (numpad layout) to canvas position. */
function alignmentToPosition(
  alignment: number,
  canvasWidth: number,
  canvasHeight: number,
  marginL: number,
  marginR: number,
  marginV: number
): { x: number; y: number; textAlign: CanvasTextAlign; textBaseline: CanvasTextBaseline } {
  // ASS numpad alignment: 1=BL, 2=BC, 3=BR, 4=ML, 5=MC, 6=MR, 7=TL, 8=TC, 9=TR
  const col = ((alignment - 1) % 3); // 0=left, 1=center, 2=right
  const row = Math.floor((alignment - 1) / 3); // 0=bottom, 1=middle, 2=top

  let x: number;
  const textAlign: CanvasTextAlign = col === 0 ? 'left' : col === 1 ? 'center' : 'right';
  if (col === 0) x = marginL;
  else if (col === 1) x = canvasWidth / 2;
  else x = canvasWidth - marginR;

  let y: number;
  const textBaseline: CanvasTextBaseline = row === 0 ? 'bottom' : row === 1 ? 'middle' : 'top';
  if (row === 0) y = canvasHeight - marginV;
  else if (row === 1) y = canvasHeight / 2;
  else y = marginV;

  return { x, y, textAlign, textBaseline };
}

export class ASSRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private compiled: CompiledASS | null = null;
  private animFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  load(assText: string): void {
    try {
      this.compiled = compile(assText, {});
    } catch (err) {
      console.error('ASSRenderer: failed to compile ASS file', err);
      this.compiled = null;
    }
  }

  start(videoEl: HTMLVideoElement): void {
    this.stop();
    const loop = () => {
      this.syncCanvasSize(videoEl);
      this.renderAt(videoEl.currentTime);
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderAt(currentTimeSec: number): void {
    if (!this.compiled) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const active = this.compiled.dialogues.filter(
      (d) => d.start <= currentTimeSec && d.end >= currentTimeSec
    );

    for (const dialogue of active) {
      this.drawDialogue(dialogue);
    }
  }

  private syncCanvasSize(videoEl: HTMLVideoElement): void {
    const rect = videoEl.getBoundingClientRect();
    if (this.canvas.width !== rect.width || this.canvas.height !== rect.height) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  private drawDialogue(dialogue: Dialogue): void {
    if (!this.compiled) return;
    const styleName = dialogue.style;
    const styleObj: CompiledASSStyle | undefined = this.compiled.styles[styleName] ?? this.compiled.styles['Default'];
    if (!styleObj) return;

    const style = styleObj.style;
    const tag = styleObj.tag;

    const scaleX = this.compiled.width > 0 ? this.canvas.width / this.compiled.width : 1;
    const scaleY = this.compiled.height > 0 ? this.canvas.height / this.compiled.height : 1;
    const scale = Math.min(scaleX, scaleY);

    const fontSize = Math.round(style.Fontsize * scale);
    const fontWeight = style.Bold === -1 ? 'bold' : 'normal';
    const fontStyle = style.Italic === -1 ? 'italic' : 'normal';
    this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${style.Fontname}", sans-serif`;

    const primaryColor = assColorToCss(style.PrimaryColour, tag.a1 ?? '00');
    const outlineColor = assColorToCss(style.OutlineColour, tag.a3 ?? '00');
    const outlineWidth = style.Outline * scale;

    // Collect all text from slices
    const text = dialogue.slices
      .flatMap((slice) => slice.fragments.map((f) => f.text))
      .join('');

    if (!text.trim()) return;

    let x: number;
    let y: number;
    let textAlign: CanvasTextAlign;
    let textBaseline: CanvasTextBaseline;

    if (dialogue.pos) {
      x = dialogue.pos.x * scaleX;
      y = dialogue.pos.y * scaleY;
      textAlign = 'left';
      textBaseline = 'top';
    } else {
      const marginL = style.MarginL * scaleX;
      const marginR = style.MarginR * scaleX;
      const marginV = style.MarginV * scaleY;
      ({ x, y, textAlign, textBaseline } = alignmentToPosition(
        dialogue.alignment,
        this.canvas.width,
        this.canvas.height,
        marginL,
        marginR,
        marginV
      ));
    }

    this.ctx.textAlign = textAlign;
    this.ctx.textBaseline = textBaseline;

    // Draw multi-line text (split on \N and \n)
    const lines = text.split(/\\[Nn]|\n/);
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;

    // Adjust y for multi-line bottom-aligned text
    let startY = y;
    if (textBaseline === 'bottom') {
      startY = y - (lines.length - 1) * lineHeight;
    } else if (textBaseline === 'middle') {
      startY = y - (totalHeight / 2) + lineHeight / 2;
    }

    for (let i = 0; i < lines.length; i++) {
      const lineY = startY + i * lineHeight;
      if (outlineWidth > 0) {
        this.ctx.strokeStyle = outlineColor;
        this.ctx.lineWidth = outlineWidth * 2;
        this.ctx.lineJoin = 'round';
        this.ctx.strokeText(lines[i], x, lineY);
      }
      this.ctx.fillStyle = primaryColor;
      this.ctx.fillText(lines[i], x, lineY);
    }
  }
}
