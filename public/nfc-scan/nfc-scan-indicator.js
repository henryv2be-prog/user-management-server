class NfcScanIndicator extends HTMLElement {
  static get observedAttributes() {
    return ["status"];
  }

  constructor() {
    super();
    this._status = "scanning"; // scanning | granted | denied
    this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --size: 520px;
          --border-radius: 120px;
          --track-color: rgba(180, 220, 255, 0.28);
          --scan-color: #6ecbff;
          --scan-glow: rgba(110, 203, 255, 0.9);
          --success-color: #17d466;
          --success-glow: rgba(23, 212, 102, 0.85);
          --error-color: #ff3b30;
          --error-glow: rgba(255, 59, 48, 0.85);
          --bg: #0f1a22;
          display: inline-block;
        }

        .wrap {
          width: var(--size);
          height: calc(var(--size) * 0.48);
          position: relative;
          border-radius: var(--border-radius);
          background: radial-gradient(120% 120% at 50% 50%, #121e27 0%, #0a141b 100%);
          box-shadow:
            inset 0 0 20px rgba(0,0,0,0.8),
            0 2px 12px rgba(0,0,0,0.6);
          overflow: hidden;
          isolation: isolate;
          transform: rotate(90deg);
          transform-origin: center;
        }

        /* track */
        .track {
          position: absolute;
          inset: 18px;
          border-radius: calc(var(--border-radius) - 18px);
          background: transparent;
          box-shadow: 0 0 0 3px var(--track-color) inset;
        }

        /* bright border that we tint per status */
        .glow-border {
          position: absolute;
          inset: 18px;
          border-radius: calc(var(--border-radius) - 18px);
          pointer-events: none;
          --border-color: var(--scan-color);
          --shadow: 0 0 18px var(--scan-glow), 0 0 36px var(--scan-glow), 0 0 64px var(--scan-glow);
          box-shadow: 0 0 0 2px var(--border-color) inset, var(--shadow);
          opacity: 0.95;
          transition: box-shadow 300ms ease, filter 300ms ease, opacity 300ms ease;
        }

        :host([status="granted"]) .glow-border {
          --border-color: var(--success-color);
          --shadow: 0 0 18px var(--success-glow), 0 0 42px var(--success-glow), 0 0 78px var(--success-glow);
        }
        :host([status="denied"]) .glow-border {
          --border-color: var(--error-color);
          --shadow: 0 0 18px var(--error-glow), 0 0 42px var(--error-glow), 0 0 78px var(--error-glow);
        }

        /* moving orbs along the rounded rectangle path */
        .orb {
          position: absolute;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          filter: blur(0.5px);
          box-shadow:
            0 0 12px rgba(255,255,255,0.95),
            0 0 32px var(--scan-glow),
            0 0 64px var(--scan-glow),
            0 0 96px var(--scan-glow);
          mix-blend-mode: screen;
          animation: moveAlong 4.5s linear infinite;
        }
        .orb:nth-child(1) { animation-delay: 0s; }
        .orb:nth-child(2) { animation-delay: 0.6s; }
        .orb:nth-child(3) { animation-delay: 1.2s; }
        .orb:nth-child(4) { animation-delay: 1.8s; }

        :host([status="granted"]) .orb {
          box-shadow:
            0 0 12px rgba(255,255,255,0.85),
            0 0 28px var(--success-glow),
            0 0 56px var(--success-glow),
            0 0 84px var(--success-glow);
        }
        :host([status="denied"]) .orb {
          box-shadow:
            0 0 12px rgba(255,255,255,0.85),
            0 0 28px var(--error-glow),
            0 0 56px var(--error-glow),
            0 0 84px var(--error-glow);
        }

        /* Rounded rectangle path motion using offset-path */
        .path {
          position: absolute;
          inset: 18px;
          border-radius: calc(var(--border-radius) - 18px);
          pointer-events: none;
        }

        .path .orb {
          offset-path: path(
            "M 40 0 H calc(100% - 40px) Q 100% 0 100% 40 V calc(100% - 40px) Q 100% 100% calc(100% - 40px) 100% H 40 Q 0 100% 0 calc(100% - 40px) V 40 Q 0 0 40 0 Z"
          );
          /* Fallback for browsers lacking offset-path: move with SVG animateMotion */
        }

        @keyframes moveAlong {
          0%   { offset-distance: 0%; }
          100% { offset-distance: 100%; }
        }

        /* faint global bloom during scanning */
        .ambient {
          position: absolute;
          inset: 0;
          border-radius: var(--border-radius);
          background: radial-gradient(60% 60% at 50% 10%, rgba(110, 203, 255, 0.12), transparent 60%),
                      radial-gradient(60% 60% at 50% 90%, rgba(110, 203, 255, 0.10), transparent 60%);
          filter: blur(12px);
          opacity: 0.7;
          transition: opacity 300ms ease, background 300ms ease;
          pointer-events: none;
        }
        :host([status="granted"]) .ambient { background: radial-gradient(60% 60% at 50% 50%, rgba(23, 212, 102, 0.12), transparent 60%); }
        :host([status="denied"]) .ambient { background: radial-gradient(60% 60% at 50% 50%, rgba(255, 59, 48, 0.12), transparent 60%); }

        /* success / denied pulse once */
        :host([status="granted"]) .glow-border { animation: pulseGreen 800ms ease-out 1; }
        :host([status="denied"]) .glow-border { animation: pulseRed 800ms ease-out 1; }

        @keyframes pulseGreen {
          0% { filter: brightness(1.2); }
          50% { filter: brightness(1.6) saturate(1.2); }
          100% { filter: brightness(1); }
        }
        @keyframes pulseRed {
          0% { filter: brightness(1.2); }
          50% { filter: brightness(1.6) saturate(1.2); }
          100% { filter: brightness(1); }
        }

        /* label */
        .label {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(-90deg);
          color: #cfe9ff;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          font-weight: 600;
          letter-spacing: 0.6px;
          opacity: 0.85;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          transition: color 250ms ease;
        }
        :host([status="granted"]) .label { color: #bff5d7; }
        :host([status="denied"]) .label { color: #ffc5c0; }

        /* graceful reduce-motion support */
        @media (prefers-reduced-motion: reduce) {
          .orb { animation-duration: 9s; }
        }
      </style>
      <div class="wrap">
        <div class="ambient"></div>
        <div class="track"></div>
        <div class="glow-border"></div>
        <div class="path">
          <div class="orb"></div>
          <div class="orb"></div>
          <div class="orb"></div>
          <div class="orb"></div>
        </div>
        <div class="label">Scanning...</div>
      </div>
    `;
  }

  connectedCallback() {
    if (this.hasAttribute("status")) {
      this._applyStatus(this.getAttribute("status"));
    } else {
      this._applyStatus(this._status);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "status" && oldValue !== newValue) {
      this._applyStatus(newValue);
    }
  }

  set status(value) {
    this.setAttribute("status", value);
  }
  get status() {
    return this.getAttribute("status") || this._status;
  }

  _applyStatus(newStatus) {
    const normalized = ["scanning", "granted", "denied"].includes(newStatus)
      ? newStatus
      : "scanning";

    this._status = normalized;

    const label = this.shadowRoot.querySelector(".label");
    if (!label) return;

    if (normalized === "scanning") {
      label.textContent = "Scanning...";
    } else if (normalized === "granted") {
      label.textContent = "Access granted";
    } else {
      label.textContent = "Access denied";
    }
  }
}

customElements.define("nfc-scan-indicator", NfcScanIndicator);
