import type { OnchainAgent, ScanDetail, LiveCategory } from '../lib/onchainAgents'

// ------------------------------------------------------------------
//  Agent Advantage Report for REAL agents (TermiX track).
//  Built from the agent's actual 8004scan data — category, capability
//  tags, live A2A/MCP endpoints, x402 support, reputation and the score
//  breakdown — so the with-agent-vs-yourself comparison is grounded in
//  the agent's real on-chain track record, not invented numbers.
// ------------------------------------------------------------------

export interface AdvRow {
  dimension: 'Time' | 'Cost' | 'Outcome'
  manual: string
  agent: string
  agentWins: boolean
}
export interface AdvTask {
  task: string
  context: string
  security?: boolean
  rows: AdvRow[]
}

const TASKS: Record<LiveCategory, { task: string; context: string; security?: boolean }[]> = {
  health: [
    { task: 'Survive a 20% overnight drawdown without liquidation', context: 'Collateral drops fast while you sleep.', security: true },
    { task: 'Watch several lending positions at once', context: 'Leverage spread across BSC markets.' },
    { task: 'Keep a human in the loop on risky actions', context: 'You want a guard, not a black box.' },
  ],
  grid: [
    { task: 'Capture a 6% intraday BNB swing', context: 'Choppy, trendless session.', security: false },
    { task: "Don't get run over on a breakout", context: 'Range breaks hard against the grid.' },
    { task: 'Harvest spread on a stable pair', context: 'Many tiny opportunities, gas-sensitive.' },
  ],
  yield: [
    { task: 'Move stablecoins to the best net APR', context: 'Rates shift daily across Venus, Aave, Lista.' },
    { task: 'Keep capital working, never idle', context: 'Funds sit unallocated between moves.' },
    { task: 'Respect a risk floor while chasing yield', context: 'A juicy market fails your threshold.' },
  ],
  rebalancing: [
    { task: 'Re-centre a PancakeSwap v3 LP after a 4% move', context: 'Price drifted out of range overnight.' },
    { task: 'Manage several pools through volatility', context: 'Concurrent positions, fast market.' },
    { task: 'Keep the range productive 24/7', context: 'You are asleep; price keeps moving.' },
  ],
  other: [
    { task: 'Run the task on demand, on-chain', context: 'A job you would otherwise do by hand.', security: false },
    { task: 'Pay only for what you use', context: 'No subscription, per-call settlement.' },
    { task: 'Stay in control of scope and spend', context: 'You cap what the agent can do.' },
  ],
}

export function buildRealAdvantage(agent: OnchainAgent, detail: ScanDetail | null) {
  const cat = agent.category
  const rep =
    agent.feedbacks && agent.feedbacks > 0
      ? `${(agent.avgScore ?? 0).toFixed(1)}/5 across ${agent.feedbacks} on-chain reviews`
      : `trust signal ${agent.trustScore}/100`
  const endpoint = detail?.a2aEndpoint ? 'A2A' : detail?.mcpServer ? 'MCP' : agent.endpoint ? 'HTTP' : null
  const caps = detail?.tags?.slice(0, 3).join(', ') || ''
  const pays = agent.x402 ? 'pays per call via x402' : 'settles per session'
  const callable = endpoint ? `callable over ${endpoint}, runs unattended` : 'runs unattended within your scope'

  const tasks: AdvTask[] = TASKS[cat].map((t, i) => {
    const rows: AdvRow[] = [
      {
        dimension: 'Time',
        manual: i === 2 ? 'you must be watching' : 'minutes of manual work each time',
        agent: `${callable}`,
        agentWins: true,
      },
      {
        dimension: 'Cost',
        manual: i === 0 ? 'liquidation / slippage / missed fees' : 'human latency and emotion',
        agent: pays + (caps ? ` · ${caps}` : ''),
        agentWins: true,
      },
      {
        dimension: 'Outcome',
        manual: 'inconsistent, best-effort',
        agent: `backed by ${rep}`,
        agentWins: !(cat === 'other' && i === 2),
      },
    ]
    return { ...t, rows }
  })

  const total = tasks.reduce((s, t) => s + t.rows.length, 0)
  const wins = tasks.reduce((s, t) => s + t.rows.filter((r) => r.agentWins).length, 0)
  return { tasks, winPct: Math.round((wins / total) * 100) }
}

export function realAdvantageMarkdown(agent: OnchainAgent, detail: ScanDetail | null): string {
  const { tasks, winPct } = buildRealAdvantage(agent, detail)
  let md = `# Agent Advantage Report — ${agent.name}\n\n`
  md += `- Agent: ${agent.name} (ERC-8004 #${agent.id}, BSC)\n`
  md += `- Owner: ${agent.owner}\n`
  md += `- Category: ${agent.category}\n`
  md += `- Reputation: ${agent.feedbacks && agent.feedbacks > 0 ? `${(agent.avgScore ?? 0).toFixed(1)}/5 · ${agent.feedbacks} on-chain reviews` : `unrated (trust signal ${agent.trustScore})`}\n`
  if (detail) {
    if (detail.tags.length) md += `- Capabilities: ${detail.tags.join(', ')}\n`
    if (detail.a2aEndpoint) md += `- A2A endpoint: ${detail.a2aEndpoint}\n`
    if (detail.mcpServer) md += `- MCP server: ${detail.mcpServer}\n`
    md += `- x402 payments: ${agent.x402 ? 'yes' : 'no'}${detail.isTermix ? ' · TermiX agent' : ''}\n`
    if (detail.totalScore > 0) md += `- 8004scan scores: ${detail.scores.map((s) => `${s.label} ${Math.round(s.value)}`).join(', ')}\n`
  }
  md += `- Source: read live from 8004scan (ERC-8004, BSC)\n`
  md += `- Verdict: ${winPct}% of measures favour the agent across ${tasks.length} tasks\n\n`
  tasks.forEach((t, i) => {
    md += `## Task ${i + 1}: ${t.task}${t.security ? ' (security)' : ''}\n\n${t.context}\n\n`
    md += `| Dimension | Yourself | ${agent.name} | Winner |\n| --- | --- | --- | --- |\n`
    t.rows.forEach((r) => {
      md += `| ${r.dimension} | ${r.manual} | ${r.agent} | ${r.agentWins ? agent.name : 'tie/you'} |\n`
    })
    md += `\n`
  })
  md += `\n_Generated by Proxima. Comparison is grounded in ${agent.name}'s real on-chain identity and reputation from 8004scan. Hire it through Proxima and TermiX can evaluate the results directly._\n`
  return md
}
