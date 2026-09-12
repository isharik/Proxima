// The official BNB coin — Binance's own logo geometry (the yellow disc and
// the white BNB mark), wrapped in a pulsing glow, a slow 3D wobble and a
// sweeping shine. Pure CSS/SVG, no WebGL. Motion halts under
// prefers-reduced-motion (handled globally in index.css).

export default function HeroCoin() {
  return (
    <div className="coin-wrap" aria-hidden>
      <div className="coin-glow" />
      <div className="coin">
        <svg viewBox="0 0 2496 2496" width="116" height="116">
          <defs>
            <radialGradient id="bnbFace" cx="38%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#ffd970" />
              <stop offset="42%" stopColor="#f0b90b" />
              <stop offset="100%" stopColor="#c98f05" />
            </radialGradient>
            <linearGradient id="bnbRim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="100%" stopColor="rgba(120,80,0,0.25)" />
            </linearGradient>
          </defs>
          {/* disc */}
          <path
            fill="url(#bnbFace)"
            d="M1248,0c689.3,0,1248,558.7,1248,1248s-558.7,1248-1248,1248S0,1937.3,0,1248S558.7,0,1248,0L1248,0z"
          />
          <circle cx="1248" cy="1248" r="1232" fill="none" stroke="url(#bnbRim)" strokeWidth="28" />
          {/* the BNB mark */}
          <g fill="#ffffff">
            <path d="M685.9,1248l0.9,330l280.4,165v193.2l-444.5-260.7v-524L685.9,1248L685.9,1248z M685.9,918v192.3l-163.3-96.6V821.4l163.3-96.6l164.1,96.6L685.9,918L685.9,918z M1084.3,821.4l163.3-96.6l164.1,96.6L1247.6,918L1084.3,821.4L1084.3,821.4z" />
            <path d="M803.9,1509.6v-193.2l163.3,96.6v192.3L803.9,1509.6L803.9,1509.6z M1084.3,1812.2l163.3,96.6l164.1-96.6v192.3l-164.1,96.6l-163.3-96.6V1812.2L1084.3,1812.2z M1645.9,821.4l163.3-96.6l164.1,96.6v192.3l-164.1,96.6V918L1645.9,821.4L1645.9,821.4L1645.9,821.4z M1809.2,1578l0.9-330l163.3-96.6v524l-444.5,260.7v-193.2L1809.2,1578L1809.2,1578L1809.2,1578z" />
            <polygon points="1692.1,1509.6 1528.8,1605.3 1528.8,1413 1692.1,1316.4 1692.1,1509.6" />
            <path d="M1692.1,986.4l0.9,193.2l-281.2,165v330.8l-163.3,95.7l-163.3-95.7v-330.8l-281.2-165V986.4L968,889.8l279.5,165.8l281.2-165.8l164.1,96.6H1692.1L1692.1,986.4z M803.9,656.5l443.7-261.6l444.5,261.6l-163.3,96.6l-281.2-165.8L967.2,753.1L803.9,656.5L803.9,656.5z" />
          </g>
        </svg>
        <div className="coin-shine" />
      </div>
    </div>
  )
}
