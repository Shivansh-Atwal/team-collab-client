import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { wsApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import GoogleArcs from '../components/layout/GoogleArcs.jsx';
import ModuleCard from '../components/ModuleCard.jsx';
import TeamActivity from '../components/TeamActivity.jsx';
import { PriorityChip } from './Board.jsx';
import { BoardArt, CanvasArt, ChatArt, CodeArt, DashboardArt, FilesArt } from '../components/illustrations/Illustrations.jsx';
import { firstName, formatDate, greeting, plural } from '../lib/utils.js';


export default function Home() {
  const { user } = useAuth();
  const { current, currentId, online } = useWorkspace();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);

  const load = () => {
    if (!currentId) return;
    const api = wsApi(currentId);
    api.get('/tasks').then((d) => setTasks(d.tasks)).catch(() => {});
    api.get('/dashboard').then(setStats).catch(() => {});
  };
  useEffect(load, [currentId]);
  useSocketEvent('task_updated', load);

  const open = tasks.filter((t) => t.status !== 'Completed');
  const mine = open.filter((t) => t.assignee?._id === user?._id).slice(0, 5);
  const t = stats?.totals;
  const base = `/w/${currentId}`;

  const cards = [
    { to: `${base}/chat`, caption: `${online.length} online`, art: ChatArt, title: 'Chat with your team', body: 'Real-time messages, files and typing indicators in one room.' },
    { to: `${base}/board`, caption: plural(open.length, 'open task'), art: BoardArt, title: 'Plan on the task board', body: 'Assign work, set priorities and drag cards across the board.' },
    { to: `${base}/files`, caption: plural(t?.files ?? 0, 'file'), art: FilesArt, title: 'Share files & docs', body: 'One place for every upload, with owners and download links.' },
    { to: `${base}/canvas`, caption: 'Live canvas', art: CanvasArt, title: 'Design your system', body: 'Sketch ER diagrams and architectures together, live.' },
    { to: `${base}/code`, caption: plural(t?.snippets ?? 1, 'code file'), art: CodeArt, title: 'Write code together', body: 'A shared editor with syntax highlighting and live cursors.' },
    { to: `${base}/dashboard`, caption: `${t?.completionRate ?? 0}% complete`, art: DashboardArt, title: 'Track team progress', body: 'Completion rates, workload per member and trends.' },
  ];

  return (
    <div className="relative min-h-full overflow-hidden bg-gradient-to-b from-white to-surface/60">
      <GoogleArcs />
      <div className="relative px-4 pb-16 pt-8 sm:px-14 sm:pt-14">
        <h1 className="text-[24px] font-normal text-ink sm:text-[28px]">
          {greeting()}, {firstName(user?.name)}
        </h1>
        <p className="mt-1 max-w-xl text-[20px] font-light leading-snug text-ink-5 sm:text-[26px]">
          Your workspace <span className="text-ink-4">{current?.name}</span> is ready
        </p>
        {current?.description && <p className="mt-3 max-w-xl text-sm text-ink-3">{current.description}</p>}

        <p className="mt-8 text-[13px] text-gblue sm:mt-12">Pick a tool to start collaborating with your team</p>

        <div className="-mx-5 mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <ModuleCard key={c.title} {...c} />
          ))}
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg text-ink">Assigned to you</h2>
            <Link to={`${base}/board`} className="inline-flex items-center gap-1 text-sm font-medium text-gblue hover:underline">
              Open board <ArrowRight size={14} />
            </Link>
          </div>
          <div className="mt-3 divide-y divide-line rounded-lg border border-line bg-white">
            {mine.length === 0 && <p className="px-5 py-6 text-sm text-ink-4">Nothing open is assigned to you. Nice.</p>}
            {mine.map((task) => (
              <Link key={task._id} to={`${base}/board`} className="flex items-center gap-4 px-5 py-3 hover:bg-surface">
                <span className={`h-2 w-2 shrink-0 rounded-full ${task.status === 'In Progress' ? 'bg-gorange' : 'bg-ink-5'}`} />
                <span className="flex-1 truncate text-sm text-ink">{task.title}</span>
                <PriorityChip priority={task.priority} />
                {task.dueDate && (
                  <span className="hidden items-center gap-1 text-xs text-ink-4 sm:inline-flex">
                    <CalendarClock size={13} /> {formatDate(task.dueDate, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg text-ink">Team right now</h2>
          <p className="text-xs text-ink-4">Who is online and which page they are working on</p>
          <div className="mt-3 rounded-lg border border-line bg-white">
            <TeamActivity className="py-1" />
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}
