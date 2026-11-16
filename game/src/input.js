// Lumen Drift — keyboard and mouse state.
// One clear job: turn DOM events into one plain object the simulation
// reads each frame. No game logic lives here.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    /** Keys currently held, by KeyboardEvent.code. */
    this.keys = new Set();
    /** Keys pressed since the last frame was consumed. */
    this.pressed = new Set();
    /** Mouse position in canvas pixels. */
    this.mouse = { x: 640, y: 300, down: false };
    /** Mouse buttons pressed since the last frame was consumed. */
    this.clicked = false;
    this.attach();
  }

  attach() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressed.add(event.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * this.canvas.width;
      this.mouse.y = ((event.clientY - rect.top) / rect.height) * this.canvas.height;
    });
    this.canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
        this.clicked = true;
      }
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouse.down = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** True while any of the codes is held. */
  held(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  /** True if the code was pressed since the last consume. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** Clear the per-frame edges; call once per frame after reading. */
  consume() {
    this.pressed.clear();
    this.clicked = false;
  }
}
