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
          --border-radius: 36px; /* tighter corners for mobile */
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

        /* SVG ring for hairline laser look */
        .ring {
          position: absolute;
          inset: 0;
          overflow: visible;
        }
        .laser { transform: translateZ(0); }
        .laser .core {
          fill: none;
          stroke: #e8f8ff;
          stroke-width: 0.6px; /* hairline */
          vector-effect: non-scaling-stroke;
          shape-rendering: geometricPrecision;
        }
        .laser .glow {
          fill: none;
          stroke: var(--scan-color);
          stroke-width: 6px;
          opacity: 0.9;
          filter: url(#glow6);
        }
        :host([status="granted"]) .laser .glow { stroke: var(--success-color); }
        :host([status="denied"]) .laser .glow { stroke: var(--error-color); }
        :host([status="scanning"]) .laser { animation: laserPulse 1.9s ease-in-out infinite; }

        /* moving orbs removed to avoid bright dots */

        /* Rounded rectangle path motion removed; SVG used instead */

        @keyframes laserPulse {
          0%   { opacity: 0.35; filter: saturate(1) brightness(0.9); }
          50%  { opacity: 1;    filter: saturate(1.25) brightness(1.35); }
          100% { opacity: 0.35; filter: saturate(1) brightness(0.9); }
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
        :host([status="granted"]) .laser { animation: pulseGreen 800ms ease-out 1; }
        :host([status="denied"]) .laser { animation: pulseRed 800ms ease-out 1; }

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
        <svg class="ring" width="100%" height="100%" viewBox="0 0 1000 480" preserveAspectRatio="none">
          <defs>
            <filter id="glow6" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <path id="rr" d="M 40 0 H 960 Q 1000 0 1000 40 V 440 Q 1000 480 960 480 H 40 Q 0 480 0 440 V 40 Q 0 0 40 0 Z" />
          </defs>
          <g class="laser">
            <use href="#rr" class="glow" />
            <use href="#rr" class="core" />
          </g>
        </svg>
        <div class="path"></div>
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
