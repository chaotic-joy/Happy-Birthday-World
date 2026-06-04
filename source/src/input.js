// Keyboard input. Arrow keys drive; Space boosts. `enabled` gates control during
// the countdown. Boost is edge-triggered: consumeBoost() returns true once per press.
export class Input {
  constructor() {
    this.state = { up: false, down: false, left: false, right: false };
    this.enabled = false;
    this._boostQueued = false;

    this._onKey = this._onKey.bind(this);
    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup', (e) => this._onKey(e, false));
  }

  _onKey(e, down) {
    let handled = true;
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.state.up = down;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.state.down = down;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.state.left = down;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.state.right = down;
        break;
      case 'Space':
        if (down && this.enabled) this._boostQueued = true;
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  }

  // Returns the active control state (all false while disabled).
  read() {
    if (!this.enabled) return { up: false, down: false, left: false, right: false };
    return this.state;
  }

  // Edge-triggered boost request. Returns true at most once per key press.
  consumeBoost() {
    if (this._boostQueued) {
      this._boostQueued = false;
      return true;
    }
    return false;
  }
}
