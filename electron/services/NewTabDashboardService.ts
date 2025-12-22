export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  delta?: string;
};

export type DashboardEvent = {
  id: string;
  ts: number;
  title: string;
  detail?: string;
  severity?: 'info' | 'warn' | 'critical';
};

export type DashboardReasoningItem = {
  id: string;
  ts: number;
  markdown: string;
};

export type NewTabDashboardSnapshot = {
  ts: number;
  kpis: DashboardKpi[];
  events: DashboardEvent[];
  reasoning: DashboardReasoningItem[];
};

export interface DashboardDataSource {
  getSnapshot(): Promise<NewTabDashboardSnapshot>;
  tick(): Promise<NewTabDashboardSnapshot>;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function formatPct(n: number) {
  return `${Math.round(n)}%`;
}

function formatDelta(n: number, unit: string) {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n}${unit}`;
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export class DummyAeroCoreDataSource implements DashboardDataSource {
  private ts = Date.now();
  private openOrders = 42;
  private slaBreaches = 3;
  private fleetUtil = 78;
  private activeIncidents = 1;

  private last = {
    openOrders: this.openOrders,
    slaBreaches: this.slaBreaches,
    fleetUtil: this.fleetUtil,
    activeIncidents: this.activeIncidents,
  };

  private events: DashboardEvent[] = [];
  private reasoning: DashboardReasoningItem[] = [];

  async getSnapshot(): Promise<NewTabDashboardSnapshot> {
    return this.buildSnapshot();
  }

  async tick(): Promise<NewTabDashboardSnapshot> {
    this.ts = Date.now();

    // Small random walk; biased to feel “operational”.
    this.openOrders = clamp(this.openOrders + this.randInt(-2, 4), 10, 140);
    this.slaBreaches = clamp(this.slaBreaches + this.randInt(-1, 2), 0, 20);
    this.fleetUtil = clamp(this.fleetUtil + this.randInt(-2, 2), 40, 98);
    this.activeIncidents = clamp(this.activeIncidents + this.randInt(-1, 1), 0, 6);

    // Emit a small “operational” event sometimes.
    if (Math.random() < 0.55) {
      this.events.unshift(this.makeEvent());
      this.events = this.events.slice(0, 8);
    }

    // Scripted reasoning based on deltas.
    const deltas = {
      openOrders: this.openOrders - this.last.openOrders,
      slaBreaches: this.slaBreaches - this.last.slaBreaches,
      fleetUtil: this.fleetUtil - this.last.fleetUtil,
      activeIncidents: this.activeIncidents - this.last.activeIncidents,
    };

    const reasoningMd = this.makeReasoning(deltas);
    if (reasoningMd) {
      this.reasoning.unshift({ id: uid('r'), ts: this.ts, markdown: reasoningMd });
      this.reasoning = this.reasoning.slice(0, 10);
    }

    this.last = {
      openOrders: this.openOrders,
      slaBreaches: this.slaBreaches,
      fleetUtil: this.fleetUtil,
      activeIncidents: this.activeIncidents,
    };

    return this.buildSnapshot();
  }

  private buildSnapshot(): NewTabDashboardSnapshot {
    const kpis: DashboardKpi[] = [
      {
        id: 'open_orders',
        label: 'Open Orders',
        value: String(this.openOrders),
        delta: formatDelta(this.openOrders - this.last.openOrders, ''),
      },
      {
        id: 'fleet_util',
        label: 'Fleet Utilization',
        value: formatPct(this.fleetUtil),
        delta: formatDelta(this.fleetUtil - this.last.fleetUtil, 'pp'),
      },
      {
        id: 'sla_breaches',
        label: 'SLA Breaches',
        value: String(this.slaBreaches),
        delta: formatDelta(this.slaBreaches - this.last.slaBreaches, ''),
      },
      {
        id: 'active_incidents',
        label: 'Active Incidents',
        value: String(this.activeIncidents),
        delta: formatDelta(this.activeIncidents - this.last.activeIncidents, ''),
      },
    ];

    return {
      ts: this.ts,
      kpis,
      events: this.events,
      reasoning: this.reasoning,
    };
  }

  private randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private makeEvent(): DashboardEvent {
    const choices: Array<Omit<DashboardEvent, 'id' | 'ts'>> = [
      {
        title: 'Dispatch backlog rebalanced',
        detail: 'Reassigned 6 loads from ATL to DAL to reduce spillover.',
        severity: 'info',
      },
      {
        title: 'Carrier ETA drift detected',
        detail: '2 shipments trending late (>35m). Consider proactive reroute.',
        severity: 'warn',
      },
      {
        title: 'SLA breach risk rising',
        detail: 'Queue depth increased on inbound dock; validate staffing plan.',
        severity: 'warn',
      },
      {
        title: 'Incident: Telemetry ingest lag',
        detail: 'Event stream delay ~3m; dashboards may be stale.',
        severity: 'critical',
      },
      {
        title: 'Fleet utilization stabilized',
        detail: 'Idle time reduced across Zone 3; keep monitoring.',
        severity: 'info',
      },
    ];

    const base = choices[Math.floor(Math.random() * choices.length)];
    return { id: uid('e'), ts: this.ts, ...base };
  }

  private makeReasoning(d: { openOrders: number; slaBreaches: number; fleetUtil: number; activeIncidents: number }): string {
    // Keep it “LLM-like” but deterministic and compact.
    const lines: string[] = [];

    if (d.openOrders >= 3) {
      lines.push(`- **Signal**: Open orders spiked (${d.openOrders} net).`);
      lines.push(`  - **Hypothesis**: Dispatch throughput < intake (check staffing + carrier acceptance).`);
      lines.push(`  - **Next**: Prioritize high-SLA lanes; batch low-risk loads.`);
    }

    if (d.slaBreaches > 0) {
      lines.push(`- **Risk**: SLA breaches increased (+${d.slaBreaches}).`);
      lines.push(`  - **Next**: Trigger proactive notifications; escalate only critical routes.`);
    }

    if (d.activeIncidents > 0) {
      lines.push(`- **Incident**: New incident(s) detected (+${d.activeIncidents}).`);
      lines.push(`  - **Next**: Freeze non-essential workflow changes; validate telemetry pipeline.`);
    }

    if (d.fleetUtil <= -2) {
      lines.push(`- **Signal**: Fleet utilization dropped (${d.fleetUtil}pp).`);
      lines.push(`  - **Hypothesis**: Route fragmentation or staging delays.`);
      lines.push(`  - **Next**: Consolidate loads; adjust zone boundaries.`);
    }

    if (lines.length === 0) {
      // Occasional “steady state” note.
      if (Math.random() < 0.35) {
        return `- **Steady state**: No major anomalies.\n  - **Next**: Keep monitoring lane-level SLA drift.`;
      }
      return '';
    }

    return lines.join('\n');
  }
}

export class NewTabDashboardService {
  private source: DashboardDataSource;
  private snapshot: NewTabDashboardSnapshot;

  constructor(source: DashboardDataSource) {
    this.source = source;
    this.snapshot = { ts: Date.now(), kpis: [], events: [], reasoning: [] };
  }

  async init() {
    this.snapshot = await this.source.getSnapshot();
  }

  getSnapshot() {
    return this.snapshot;
  }

  async tick() {
    this.snapshot = await this.source.tick();
    return this.snapshot;
  }
}
