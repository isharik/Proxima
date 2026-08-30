import type { Agent, Category } from './agents'

// ------------------------------------------------------------------
//  Agent Advantage — the TermiX rubric: does hiring the agent beat
//  doing the job yourself, with numbers? Three concrete tasks per
//  category, each compared on time, cost and outcome. The agent's own
//  headline metric is woven in so the report reflects that agent.
// ------------------------------------------------------------------

export interface AdvantageRow {
  dimension: 'Time' | 'Cost' | 'Outcome'
  manual: string
  agent: string
  agentWins: boolean
}
export interface AdvantageTask {
  task: string
  context: string
  rows: AdvantageRow[]
}

function metric(agent: Agent, re: RegExp, fallback: string): string {
  return agent.metrics.find((m) => re.test(m.label))?.value ?? fallback
}

const BUILD: Record<Category, (a: Agent) => AdvantageTask[]> = {
  rebalancing: (a) => [
    {
      task: 'Re-centre an LP position after a 4% move',
      context: 'Price drifted out of the active range overnight.',
      rows: [
        { dimension: 'Time', manual: '~12 min (watch, decide, sign)', agent: '2 blocks, unattended', agentWins: true },
        { dimension: 'Cost', manual: 'gas + missed fees while out of range', agent: `gas only, skips if fees < cost`, agentWins: true },
        { dimension: 'Outcome', manual: 'often reset late', agent: `${metric(a, /time in range/i, '92%')} time in range`, agentWins: true },
      ],
    },
    {
      task: 'Manage 3 pools through a volatile session',
      context: 'Three concurrent positions, fast market.',
      rows: [
        { dimension: 'Time', manual: 'constant monitoring', agent: 'runs in parallel', agentWins: true },
        { dimension: 'Cost', manual: 'over-trades from panic', agent: `${metric(a, /resets/i, '2.1')} resets/wk, batched`, agentWins: true },
        { dimension: 'Outcome', manual: 'inconsistent', agent: `${metric(a, /fee apr/i, '31%')} fee APR captured`, agentWins: true },
      ],
    },
    {
      task: 'Overnight range keeping',
      context: 'You are asleep; price keeps moving.',
      rows: [
        { dimension: 'Time', manual: '0 (you miss it)', agent: '24/7', agentWins: true },
        { dimension: 'Cost', manual: 'hours out of range = lost fees', agent: 'stays productive', agentWins: true },
        { dimension: 'Outcome', manual: 'wake to a dead position', agent: 'in-range at open', agentWins: true },
      ],
    },
  ],
  grid: (a) => [
    {
      task: 'Capture a 6% intraday BNB swing (trading)',
      context: 'Sideways-to-choppy session, no clear trend.',
      rows: [
        { dimension: 'Time', manual: 'hours glued to the chart', agent: `${metric(a, /trades \/ day/i, '18')} trades/day, hands-off`, agentWins: true },
        { dimension: 'Cost', manual: 'emotional entries, wide spreads', agent: 'disciplined rungs', agentWins: true },
        { dimension: 'Outcome', manual: 'mixed, often net flat', agent: `${metric(a, /realised pnl/i, '+11.4%')} realised`, agentWins: true },
      ],
    },
    {
      task: 'Avoid getting run over on a breakout',
      context: 'Range breaks hard against the grid.',
      rows: [
        { dimension: 'Time', manual: 'react after the damage', agent: 'auto-halt on breakout', agentWins: true },
        { dimension: 'Cost', manual: 'average into a trend', agent: 'exits early', agentWins: true },
        { dimension: 'Outcome', manual: 'drawdown', agent: `${metric(a, /win rate/i, '68%')} win rate held`, agentWins: true },
      ],
    },
    {
      task: 'Harvest spread on a stable pair',
      context: 'Low volatility, many tiny opportunities.',
      rows: [
        { dimension: 'Time', manual: 'not worth doing by hand', agent: 'runs continuously', agentWins: true },
        { dimension: 'Cost', manual: 'gas kills manual edge', agent: 'gas-aware sizing', agentWins: true },
        { dimension: 'Outcome', manual: '~0', agent: 'steady small gains', agentWins: true },
      ],
    },
  ],
  yield: (a) => [
    {
      task: 'Move stablecoins to the best net APR',
      context: 'Rates differ across Venus, Aave, Lista and shift daily.',
      rows: [
        { dimension: 'Time', manual: '30+ min research + txs', agent: 'auto-routed', agentWins: true },
        { dimension: 'Cost', manual: 'may chase gross, ignore gas', agent: 'ranks net-of-gas', agentWins: true },
        { dimension: 'Outcome', manual: 'often stale allocation', agent: `${metric(a, /APR|APY/i, '9.8%')} net`, agentWins: true },
      ],
    },
    {
      task: 'Keep capital working, not idle',
      context: 'Funds sit unallocated between moves.',
      rows: [
        { dimension: 'Time', manual: 'you forget to rebalance', agent: 'continuous', agentWins: true },
        { dimension: 'Cost', manual: 'idle capital earns 0', agent: `${metric(a, /idle/i, '3%')} idle time`, agentWins: true },
        { dimension: 'Outcome', manual: 'drag on returns', agent: 'near-full utilisation', agentWins: true },
      ],
    },
    {
      task: 'Respect a risk floor while chasing yield',
      context: 'A juicy market fails your risk threshold.',
      rows: [
        { dimension: 'Time', manual: 'due diligence per market', agent: 'auto-screened', agentWins: true },
        { dimension: 'Cost', manual: 'temptation to over-reach', agent: 'refuses below floor', agentWins: true },
        { dimension: 'Outcome', manual: 'occasional blow-ups', agent: 'risk floor held 100%', agentWins: true },
      ],
    },
  ],
  health: (a) => [
    {
      task: 'Survive a 20% drawdown without liquidation (security)',
      context: 'Collateral drops fast overnight.',
      rows: [
        { dimension: 'Time', manual: 'you must wake up and act', agent: `${metric(a, /reaction/i, '2.3 blk')} reaction`, agentWins: true },
        { dimension: 'Cost', manual: 'liquidation penalty (5–10%)', agent: 'small repay from allowance', agentWins: true },
        { dimension: 'Outcome', manual: 'risk of liquidation', agent: `${metric(a, /liquidations/i, '0')} liquidations`, agentWins: true },
      ],
    },
    {
      task: 'Watch several loans at once',
      context: 'Leverage spread across markets.',
      rows: [
        { dimension: 'Time', manual: 'impossible to track manually', agent: 'all positions, always', agentWins: true },
        { dimension: 'Cost', manual: 'miss the riskiest one', agent: 'repays most-at-risk first', agentWins: true },
        { dimension: 'Outcome', manual: 'a gap gets you liquidated', agent: 'HF floor held', agentWins: true },
      ],
    },
    {
      task: 'Stay in control of what runs automatically',
      context: 'You want a guard, not a black box.',
      rows: [
        { dimension: 'Time', manual: 'alerts you might miss', agent: 'acts within your scope', agentWins: true },
        { dimension: 'Cost', manual: 'human latency', agent: 'capped, revocable', agentWins: true },
        { dimension: 'Outcome', manual: 'stress', agent: 'liquidations avoided, limits enforced', agentWins: false },
      ],
    },
  ],
}

export function advantageFor(agent: Agent): AdvantageTask[] {
  return BUILD[agent.category](agent)
}
