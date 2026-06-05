interface AbeytonLoaderProps {
  manualExit?: () => void;
  isManual?: boolean;
}

export function TenantLoader({ manualExit, isManual }: AbeytonLoaderProps) {
  return (
    <div
      className="abeyton-loader-overlay"
      onClick={isManual ? manualExit : undefined}
    >
      <div className="abeyton-loader-content">
        <svg
          version="1.0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 600 600"
          className="abeyton-logo-svg"
        >
          <g
            transform="translate(0.000000,600.000000) scale(0.100000,-0.100000)"
            fill="currentColor"
            stroke="none"
          >
            <path
              className="logo-path-a"
              d="M3902 5180 c-93 -25 -220 -84 -319 -150 -337 -226 -602 -555 -1078 -1335 -82 -135 -161 -260 -175 -277 l-26 -31 -224 17 c-494 37 -689 17 -905 -91 -132 -67 -264 -180 -346 -299 -47 -68 -107 -202 -125 -280 -22 -95 -15 -239 16 -317 46 -121 149 -213 295 -264 72 -25 93 -27 210 -26 158 1 255 25 412 104 268 136 537 414 793 821 l53 85 221 -1 c122 -1 275 3 342 7 l121 8 -68 -268 c-84 -335 -102 -442 -97 -576 3 -90 7 -108 31 -149 32 -56 68 -83 130 -99 53 -15 107 -3 151 32 43 34 47 57 19 109 -23 42 -25 52 -19 150 6 112 42 288 122 584 81 304 66 272 132 291 123 36 263 123 303 189 22 36 26 101 7 93 -124 -55 -308 -106 -308 -86 0 26 260 890 340 1129 94 282 143 387 206 445 85 79 22 206 -101 204 -22 0 -73 -9 -113 -19z m-342 -672 c-33 -106 -119 -398 -192 -650 -72 -251 -134 -462 -139 -470 -7 -10 -70 -14 -305 -17 -282 -3 -297 -2 -290 15 15 40 317 531 441 719 145 219 232 334 334 438 62 65 199 172 208 163 3 -2 -23 -91 -57 -198z m-1560 -1324 c85 -9 157 -18 159 -20 7 -6 -106 -167 -195 -278 -93 -115 -234 -253 -328 -321 -198 -141 -428 -190 -564 -121 -162 82 -166 305 -9 511 97 128 256 216 442 246 68 11 308 3 495 -17z"
            />
            <path
              className="logo-path-l"
              d="M4194 4006 c-41 -18 -79 -70 -94 -126 -27 -105 -168 -551 -235 -740 -214 -608 -441 -1096 -542 -1168 -27 -19 -35 -20 -139 -11 -278 26 -543 -35 -663 -151 -187 -182 17 -407 350 -387 197 12 370 90 537 242 l63 58 231 -63 c275 -75 417 -104 575 -121 362 -37 712 67 903 267 87 92 122 164 128 264 5 97 -21 170 -84 235 -86 89 -226 127 -291 79 -40 -30 -40 -55 0 -99 58 -63 70 -131 36 -202 -81 -166 -389 -249 -834 -223 -157 10 -504 46 -512 53 -1 2 19 34 44 73 203 302 389 729 606 1389 92 280 147 465 147 496 0 42 -42 110 -80 130 -41 22 -102 24 -146 5z m-1025 -2233 c-1 -17 -109 -97 -177 -130 -60 -30 -86 -37 -152 -41 -106 -6 -170 16 -170 57 0 45 58 83 164 106 65 14 336 20 335 8z"
            />
          </g>
        </svg>
        <div className="loader-text">Abeyton Lodge</div>
        {isManual && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--zinc-500)",
              marginTop: "10px",
            }}
          >
            Click anywhere to close
          </span>
        )}
      </div>

      <style>{`
        .abeyton-loader-overlay {
          position: fixed;
          inset: 0;
          background: var(--bg-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          cursor: ${isManual ? "pointer" : "default"};
        }
        .abeyton-loader-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          animation: gentleFloat 3s ease-in-out infinite;
        }
        .abeyton-logo-svg {
          width: 120px;
          height: 120px;
          color: var(--zinc-900);
        }
        .logo-path-a { opacity: 0; animation: logoFadeIn 1.2s ease-out forwards; }
        .logo-path-l { opacity: 0; animation: logoFadeIn 1.2s ease-out 0.4s forwards; }
        .loader-text {
          font-family: var(--font-display);
          font-size: 14px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--zinc-400);
          opacity: 0;
          animation: logoFadeIn 1.5s ease-out 0.8s forwards;
        }
        @keyframes logoFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
