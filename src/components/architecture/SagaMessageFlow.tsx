/**
 * SagaMessageFlow. static SVG of the place-order saga choreography.
 *
 * Shows the happy path top-to-bottom and the compensating path on the
 * right. Same conventions as ArchitectureCanvas. solid lines for HTTP,
 * dashed for MassTransit events. No animation. This is the diagram that
 * answers "how does the saga actually flow" without prose.
 */

const W = 1000;
const H = 600;

const HAPPY_X = 180;
const COMP_X = 760;

interface Step {
  label: string;
  owner: string;
  y: number;
}

const HAPPY: Step[] = [
  { label: 'OrderCreated',                 owner: 'orders',    y: 80 },
  { label: 'StockReservationRequested',    owner: 'checkout',  y: 160 },
  { label: 'StockReservationCommitted',    owner: 'catalog',   y: 240 },
  { label: 'PaymentSessionRequested',      owner: 'checkout',  y: 320 },
  { label: 'PaymentCaptured',              owner: 'payments',  y: 400 },
  { label: 'OrderCompleted',               owner: 'checkout',  y: 480 },
];

const COMP: Step[] = [
  { label: 'StockReservationFailed',       owner: 'catalog',  y: 240 },
  { label: 'OrderCompensating',            owner: 'checkout', y: 320 },
  { label: 'OrderAbandoned',               owner: 'checkout', y: 400 },
];

export function SagaMessageFlow() {
  return (
    <div className="relative w-full glass border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-muted z-10">
        <span>place-order saga · MassTransit choreography</span>
        <span>happy path · left  ·  compensation · right</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Place-order saga message flow"
      >
        {/* Lane labels */}
        <g fontFamily="ui-monospace, SF Mono, monospace" fontSize="10" fill="rgb(160 160 160)">
          <text x={HAPPY_X} y={48} textAnchor="middle" letterSpacing="2">
            HAPPY PATH
          </text>
          <text x={COMP_X} y={48} textAnchor="middle" letterSpacing="2" fill="rgb(220 38 38 / 0.85)">
            COMPENSATION
          </text>
        </g>

        {/* Happy path verticals */}
        <g fill="none" stroke="rgb(91 63 214 / 0.45)" strokeWidth="1.4" strokeDasharray="6 4">
          {HAPPY.slice(0, -1).map((s, i) => {
            const next = HAPPY[i + 1];
            return (
              <line
                key={`hp-${i}`}
                x1={HAPPY_X}
                y1={s.y + 22}
                x2={HAPPY_X}
                y2={next.y - 22}
              />
            );
          })}
        </g>

        {/* Branch arrow from StockReservationRequested → StockReservationFailed */}
        <g fill="none" stroke="rgb(220 38 38 / 0.55)" strokeWidth="1.4" strokeDasharray="6 4">
          <path
            d={`M ${HAPPY_X + 90} ${HAPPY[1].y} Q ${(HAPPY_X + COMP_X) / 2} ${HAPPY[1].y} ${COMP_X - 90} ${COMP[0].y}`}
          />
        </g>

        {/* Compensation verticals */}
        <g fill="none" stroke="rgb(220 38 38 / 0.55)" strokeWidth="1.4" strokeDasharray="6 4">
          {COMP.slice(0, -1).map((s, i) => {
            const next = COMP[i + 1];
            return (
              <line
                key={`cp-${i}`}
                x1={COMP_X}
                y1={s.y + 22}
                x2={COMP_X}
                y2={next.y - 22}
              />
            );
          })}
        </g>

        {/* Happy path nodes */}
        <g fontFamily="ui-monospace, SF Mono, monospace">
          {HAPPY.map((s, i) => (
            <StepBox
              key={`h-${i}`}
              x={HAPPY_X}
              y={s.y}
              label={s.label}
              owner={s.owner}
              tone="ok"
            />
          ))}
        </g>

        {/* Compensation nodes */}
        <g fontFamily="ui-monospace, SF Mono, monospace">
          {COMP.map((s, i) => (
            <StepBox
              key={`c-${i}`}
              x={COMP_X}
              y={s.y}
              label={s.label}
              owner={s.owner}
              tone="err"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}

function StepBox({
  x,
  y,
  label,
  owner,
  tone,
}: {
  x: number;
  y: number;
  label: string;
  owner: string;
  tone: 'ok' | 'err';
}) {
  const w = 240;
  const h = 44;
  const stroke = tone === 'ok' ? 'rgb(91 63 214)' : 'rgb(220 38 38)';
  const labelColor = tone === 'ok' ? 'rgb(245 245 240)' : 'rgb(254 202 202)';
  return (
    <g>
      <rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        rx={6}
        ry={6}
        fill="rgba(11,11,14,0.9)"
        stroke={stroke}
        strokeWidth={1.4}
      />
      <text x={x} y={y - 2} textAnchor="middle" fontSize="11" fill={labelColor}>
        {label}
      </text>
      <text
        x={x}
        y={y + 14}
        textAnchor="middle"
        fontSize="9"
        fill="rgb(160 160 160)"
        letterSpacing="1.5"
      >
        {owner.toUpperCase()}
      </text>
    </g>
  );
}
