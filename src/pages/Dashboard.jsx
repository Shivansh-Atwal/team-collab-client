import { useEffect, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, CheckCircle2, ListTodo, Users } from 'lucide-react';
import { wsApi } from '../api/client.js';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import PageHeader from '../components/PageHeader.jsx';
import Avatar from '../components/ui/Avatar.jsx';
import FullPageSpinner from '../components/ui/FullPageSpinner.jsx';
import { plural } from '../lib/utils.js';

// Validated chart palette (see dataviz check): blue/orange pass CVD separation; gray is the neutral "not started" state
const C = { completed: '#1a73e8', progress: '#e37400', todo: '#bdc1c6', grid: '#eceff1', axis: '#80868b' };
const PRIORITY_RAMP = { Low: '#aecbfa', Medium: '#669df6', High: '#1967d2' };

function Tile({ icon: Icon, label, value, sub, tone = 'text-gblue', children }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-ink-3">
        <Icon size={16} className={tone} /> {label}
      </div>
      <div className="mt-3 text-[32px] font-normal leading-none tabular-nums text-ink">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-ink-4">{sub}</div>}
      {children}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lift">
      <div className="mb-1 font-medium text-ink">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-ink-3">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="tabular-nums text-ink">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

const shortDate =(iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function Dashboard() {
  const { currentId } = useWorkspace();
  const [data, setData] = useState(null);
  const timer = useRef(null);

  const load = () => currentId && wsApi(currentId).get('/dashboard').then(setData).catch(() => {});
  useEffect(() => {
    setData(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // Refresh (debounced) whenever tasks or presence change anywhere in the workspace
  const refreshSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(load, 400);
  };
  useSocketEvent('task_updated', refreshSoon);
  useSocketEvent('presence_update', refreshSoon);
  useSocketEvent('members_updated', refreshSoon);
  useEffect(() => () => clearTimeout(timer.current), []);

  if (!data) return <FullPageSpinner />;
  const { totals, byStatus, byPriority, perMember, timeline } = data;

  const statusRows = [
    { key: 'Completed', color: C.completed },
    { key: 'In Progress', color: C.progress },
    { key: 'To Do', color: C.todo },
  ];
  const memberData = perMember
    .map((m) => ({ name: m.user.name.split(' ')[0], full: m.user.name, Completed: m.completed, Open: m.assigned - m.completed, rate: m.completionRate, user: m.user }))
    .sort((a, b) => b.Completed + b.Open - (a.Completed + a.Open));
  const timelineData = timeline.map((d) => ({ ...d, label: shortDate(d.date) }));
  const maxPriority = Math.max(1, ...Object.values(byPriority));

  return (
    <div className="pb-12">
      <PageHeader title="Performance dashboard" sub="Project progress and team workload — updates live" />

      <div className="space-y-6 px-6 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Tile icon={ListTodo} label="Total tasks" value={totals.tasks} sub={[plural(totals.messages, 'message'), plural(totals.files, 'file'), plural(totals.snippets, 'code file')].join(' · ')} />
          <Tile icon={CheckCircle2} label="Completion rate" value={`${totals.completionRate}%`} sub={`${totals.completed} of ${totals.tasks} tasks completed`}>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-gblue transition-all" style={{ width: `${totals.completionRate}%` }} />
            </div>
          </Tile>
          <Tile icon={Users} label="Active members" value={`${totals.online}/${totals.members}`} sub="online now / in workspace" tone="text-ggreen" />
          <Tile icon={AlertTriangle} label="Overdue" value={totals.overdue} sub={totals.overdue ? 'open tasks past their due date' : 'nothing overdue'} tone={totals.overdue ? 'text-gred' : 'text-ink-4'} />
        </div>

        {/* Status breakdown: one 100% stacked bar with a labeled legend */}
        <section className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-base text-ink">Project progress</h2>
          <p className="text-xs text-ink-4">Tasks by status</p>
          <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface">
            {totals.tasks > 0 &&
              statusRows.map(({ key, color }) =>
                byStatus[key] ? <div key={key} title={`${key}: ${byStatus[key]}`} style={{ width: `${(byStatus[key] / totals.tasks) * 100}%`, background: color }} /> : null
              )}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
            {statusRows.map(({ key, color }) => (
              <div key={key} className="flex items-center gap-2 text-sm text-ink-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                {key}
                <span className="tabular-nums text-ink">{byStatus[key]}</span>
                <span className="text-xs text-ink-4">{totals.tasks ? Math.round((byStatus[key] / totals.tasks) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-base text-ink">Activity</h2>
            <p className="text-xs text-ink-4">Tasks created vs. completed, last 14 days</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={20} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#9aa0a6', strokeDasharray: '3 3' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#5f6368' }} />
                  <Line type="monotone" dataKey="created" name="Created" stroke={C.progress} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                  <Line type="monotone" dataKey="completed" name="Completed" stroke={C.completed} strokeWidth={2} dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-base text-ink">Workload by member</h2>
            <p className="text-xs text-ink-4">Assigned tasks, completed vs. open</p>
            <div className="mt-4" style={{ height: Math.max(160, memberData.length * 44 + 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }} barCategoryGap={10}>
                  <CartesianGrid stroke={C.grid} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: C.axis }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: '#3c4043' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f3f4' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#5f6368' }} />
                  <Bar dataKey="Completed" stackId="a" fill={C.completed} stroke="#fff" strokeWidth={2} maxBarSize={22} />
                  <Bar dataKey="Open" stackId="a" fill={C.todo} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <section className="overflow-hidden rounded-xl border border-line bg-white">
            <h2 className="px-5 pt-5 text-base text-ink">Completion rate per member</h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="bg-surface text-xs text-ink-3">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Member</th>
                  <th className="px-3 py-2.5 text-right font-medium">Assigned</th>
                  <th className="px-3 py-2.5 text-right font-medium">In progress</th>
                  <th className="px-3 py-2.5 text-right font-medium">Completed</th>
                  <th className="w-1/3 px-5 py-2.5 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {memberData.map((m) => {
                  const pm = perMember.find((p) => p.user._id === m.user._id);
                  return (
                    <tr key={m.user._id}>
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2 text-ink"><Avatar user={m.user} size={24} /> {m.full}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-2">{pm.assigned}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-2">{pm.inProgress}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-ink-2">{pm.completed}</td>
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                            <div className="h-full rounded-full bg-gblue" style={{ width: `${m.rate}%` }} />
                          </div>
                          <span className="w-9 text-right text-xs tabular-nums text-ink-2">{m.rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-line bg-white p-5">
            <h2 className="text-base text-ink">By priority</h2>
            <p className="text-xs text-ink-4">All tasks</p>
            <div className="mt-5 space-y-4">
              {['High', 'Medium', 'Low'].map((p) => (
                <div key={p}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="text-ink-2">{p}</span>
                    <span className="tabular-nums text-ink">{byPriority[p]}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${(byPriority[p] / maxPriority) * 100}%`, background: PRIORITY_RAMP[p] }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
