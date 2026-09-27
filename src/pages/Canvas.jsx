import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Arrow, Circle, Group, Label, Layer, Path, Rect, Stage, Tag, Text, Transformer } from 'react-konva';
import { Circle as CircleIcon, Download, Hand, MousePointer2, MoveUpRight, Square, Trash2, Type, ZoomIn, ZoomOut, Eraser } from 'lucide-react';
import { errorMessage, wsApi } from '../api/client.js';
import { useSocket } from '../context/SocketContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import useSocketEvent from '../hooks/useSocketEvent.js';
import { AvatarStack } from '../components/ui/Avatar.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { cx, uid } from '../lib/utils.js';

const FONT = 'Roboto, sans-serif';
const SWATCHES = [
  { fill: '#e8f0fe', stroke: '#1a73e8' },
  { fill: '#e6f4ea', stroke: '#188038' },
  { fill: '#fef7e0', stroke: '#e37400' },
  { fill: '#fce8e6', stroke: '#d93025' },
  { fill: '#f3e8fd', stroke: '#9334e6' },
  { fill: '#ffffff', stroke: '#5f6368' },
];
const TOOLS = [
  { id: 'select', icon: MousePointer2, label: 'Select (V)', key: 'v' },
  { id: 'hand', icon: Hand, label: 'Pan (H)', key: 'h' },
  { id: 'rect', icon: Square, label: 'Rectangle / entity (R)', key: 'r' },
  { id: 'circle', icon: CircleIcon, label: 'Circle / service (C)', key: 'c' },
  { id: 'text', icon: Type, label: 'Text (T)', key: 't' },
  { id: 'connector', icon: MoveUpRight, label: 'Connector (A): click two shapes', key: 'a' },
];

const CORNER_ANCHORS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const ALL_ANCHORS = [...CORNER_ANCHORS, 'top-center', 'bottom-center', 'middle-left', 'middle-right'];

/* ------------------------------- geometry ------------------------------- */
const textBox = (el) => {
  const lines = String(el.text || '').split('\n');
  const longest = Math.max(...lines.map((l) => l.length), 1);
  return { w: el.width || longest * el.fontSize * 0.58, h: lines.length * el.fontSize * 1.2 };
};
const center = (el) => {
  if (el.type === 'circle') return { x: el.x, y: el.y };
  const { w, h } = el.type === 'text' ? textBox(el) : { w: el.width, h: el.height };
  return { x: el.x + w / 2, y: el.y + h / 2 };
};
// Point where the line from the shape's center toward (tx, ty) leaves its outline
const edgePoint = (el, tx, ty) => {
  const c = center(el);
  const dx = tx - c.x;
  const dy = ty - c.y;
  if (!dx && !dy) return c;
  if (el.type === 'circle') {
    const len = Math.hypot(dx, dy);
    return { x: c.x + (dx / len) * el.radius, y: c.y + (dy / len) * el.radius };
  }
  const { w, h } = el.type === 'text' ? textBox(el) : { w: el.width, h: el.height };
  const s = Math.min(w / 2 / Math.abs(dx || 1e-9), h / 2 / Math.abs(dy || 1e-9));
  return { x: c.x + dx * s, y: c.y + dy * s };
};

// Same reducer the server runs, so local and remote state converge
function applyOp(elements, op) {
  switch (op.type) {
    case 'add':
      return elements.some((e) => e.id === op.element.id) ? elements : [...elements, op.element];
    case 'update':
      return elements.map((e) => (e.id === op.element.id ? { ...e, ...op.element } : e));
    case 'delete': {
      const ids = new Set(op.ids);
      return elements.filter((e) => !ids.has(e.id) && !ids.has(e.from) && !ids.has(e.to));
    }
    case 'replace':
      return op.elements || [];
    default:
      return elements;
  }
}

function throttle(fn, ms) {
  let last = 0;
  let timer = null;
  let lastArgs = null;
  return (...args) => {
    lastArgs = args;
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...lastArgs);
      }, ms - (now - last));
    }
  };
}

/* -------------------------------- shapes -------------------------------- */
const withDefaults = (el) => ({
  fill: SWATCHES[0].fill,
  stroke: SWATCHES[0].stroke,
  fontSize: el.type === 'text' ? 18 : 14,
  ...(el.type === 'rect' && { width: 160, height: 80 }),
  ...(el.type === 'circle' && { radius: 50 }),
  ...el,
});

function ShapeNode({ el: raw, draggable, highlighted, handlers }) {
  const el = withDefaults(raw);
  const common = {
    id: el.id,
    x: el.x,
    y: el.y,
    draggable,
    onMouseDown: (e) => handlers.select(e, el),
    onTap: (e) => handlers.select(e, el),
    onDragMove: (e) => handlers.dragMove(el, e.target),
    onDragEnd: (e) => handlers.dragEnd(el, e.target),
    onTransformEnd: (e) => handlers.transformEnd(el, e.target),
    onDblClick: (e) => handlers.edit(el, e.currentTarget),
    onDblTap: (e) => handlers.edit(el, e.currentTarget),
  };
  const outline = highlighted ? { shadowColor: '#1a73e8', shadowBlur: 12, shadowOpacity: 0.6 } : { shadowColor: '#3c4043', shadowBlur: 6, shadowOpacity: 0.12, shadowOffsetY: 2 };
  const label = { text: el.text, fontSize: el.fontSize || 14, fontFamily: FONT, fill: '#202124', align: 'center', verticalAlign: 'middle', padding: 8, listening: false };

  if (el.type === 'rect') {
    return (
      <Group {...common}>
        <Rect width={el.width} height={el.height} fill={el.fill} stroke={el.stroke} strokeWidth={1.5} cornerRadius={8} {...outline} />
        <Text width={el.width} height={el.height} {...label} />
      </Group>
    );
  }
  if (el.type === 'circle') {
    return (
      <Group {...common}>
        <Circle radius={el.radius} fill={el.fill} stroke={el.stroke} strokeWidth={1.5} {...outline} />
        <Text x={-el.radius} y={-el.radius} width={el.radius * 2} height={el.radius * 2} {...label} />
      </Group>
    );
  }
  if (el.type === 'text') {
    return <Text {...common} text={el.text} fontSize={el.fontSize} fontFamily={FONT} fill={el.stroke || '#202124'} lineHeight={1.2} {...(highlighted ? outline : {})} />;
  }
  return null;
}

function Connector({ el, byId, selected, onSelect }) {
  if (!byId[el.from] || !byId[el.to]) return null;
  const a = withDefaults(byId[el.from]);
  const b = withDefaults(byId[el.to]);
  const ca = center(a);
  const cb = center(b);
  const p1 = edgePoint(a, cb.x, cb.y);
  const p2 = edgePoint(b, ca.x, ca.y);
  return (
    <Arrow
      id={el.id}
      points={[p1.x, p1.y, p2.x, p2.y]}
      stroke={selected ? '#1a73e8' : el.stroke || '#5f6368'}
      fill={selected ? '#1a73e8' : el.stroke || '#5f6368'}
      strokeWidth={selected ? 2.5 : 2}
      pointerLength={10}
      pointerWidth={9}
      hitStrokeWidth={14}
      dash={el.dashed ? [8, 6] : undefined}
      onMouseDown={(e) => onSelect(e, el)}
      onTap={(e) => onSelect(e, el)}
    />
  );
}

function RemoteCursor({ cursor, scale }) {
  return (
    <Group x={cursor.x} y={cursor.y} scaleX={1 / scale} scaleY={1 / scale} listening={false}>
      <Path data="M0 0 L0 16 L4.5 12 L7.5 19 L10 18 L7 11 L13 11 Z" fill={cursor.user.color} stroke="#fff" strokeWidth={1} />
      <Label x={12} y={18}>
        <Tag fill={cursor.user.color} cornerRadius={4} />
        <Text text={cursor.user.name} fill="#fff" fontSize={11} fontFamily={FONT} padding={4} />
      </Label>
    </Group>
  );
}

/* --------------------------------- page --------------------------------- */
export default function CanvasPage() {
  const { socket, connected } = useSocket();
  const { currentId, online } = useWorkspace();
  const toast = useToast();

  const [elements, setElements] = useState([]);
  const [tool, setTool] = useState('select');
  const [selectedId, setSelectedId] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [editing, setEditing] = useState(null); // { id, box, value }
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [cursors, setCursors] = useState({});

  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const trRef = useRef(null);

  const byId = useMemo(() => Object.fromEntries(elements.map((e) => [e.id, e])), [elements]);
  const selected = selectedId ? byId[selectedId] : null;

  // Fit the stage to its container
  useEffect(() => {
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // Load (and reload after reconnecting, in case we missed ops while offline)
  useEffect(() => {
    if (!currentId) return;
    wsApi(currentId).get('/canvas').then((d) => setElements(d.elements || []));
  }, [currentId, connected]);

  /* ----------------------------- sync helpers ----------------------------- */
  const emitOp = useCallback((op) => socket?.emit('canvas_draw', { workspaceId: currentId, op }), [socket, currentId]);
  const commit = useCallback(
    (op) => {
      setElements((els) => applyOp(els, op));
      emitOp(op);
    },
    [emitOp]
  );
  const emitMove = useMemo(() => throttle((element) => emitOp({ type: 'update', element }), 40), [emitOp]);
  const emitCursor = useMemo(() => throttle((pos) => socket?.emit('canvas_cursor', { workspaceId: currentId, ...pos }), 50), [socket, currentId]);

  useSocketEvent('canvas_draw', ({ workspaceId, op }) => {
    if (workspaceId === currentId) setElements((els) => applyOp(els, op));
  });
  useSocketEvent('canvas_cursor', ({ user, x, y }) => setCursors((c) => ({ ...c, [user._id]: { user, x, y, t: Date.now() } })));

  // Drop cursors of people who left or went idle
  useEffect(() => {
    const onlineIds = new Set(online.map((u) => u._id));
    setCursors((c) => Object.fromEntries(Object.entries(c).filter(([id]) => onlineIds.has(id))));
  }, [online]);
  useEffect(() => {
    const t = setInterval(() => setCursors((c) => Object.fromEntries(Object.entries(c).filter(([, v]) => Date.now() - v.t < 8000))), 3000);
    return () => clearInterval(t);
  }, []);

  // Attach the resize handles to the selected shape
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const node = selected && selected.type !== 'connector' && tool === 'select' ? stageRef.current.findOne((n) => n.id() === selected.id) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selected, tool, elements]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    commit({ type: 'delete', ids: [selectedId] });
    setSelectedId(null);
  }, [selectedId, commit]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (editing || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedId(null);
        setConnectFrom(null);
        setTool('select');
      } else if (!e.ctrlKey && !e.metaKey) {
        const t = TOOLS.find((x) => x.key === e.key.toLowerCase());
        if (t) setTool(t.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, deleteSelected]);

  /* ------------------------------ interactions ----------------------------- */
  const pointer = () => stageRef.current.getRelativePointerPosition();

  const onStageMouseDown = (e) => {
    if (e.target !== e.target.getStage()) return;
    const p = pointer();
    const swatch = SWATCHES[0];
    let element = null;
    if (tool === 'rect') element = { id: uid(), type: 'rect', x: p.x - 80, y: p.y - 40, width: 160, height: 80, ...swatch, text: 'Entity', fontSize: 14 };
    if (tool === 'circle') element = { id: uid(), type: 'circle', x: p.x, y: p.y, radius: 50, ...SWATCHES[1], text: 'Service', fontSize: 14 };
    if (tool === 'text') element = { id: uid(), type: 'text', x: p.x, y: p.y - 10, text: 'Double-click to edit', fontSize: 18, stroke: '#202124' };
    if (element) {
      commit({ type: 'add', element });
      setSelectedId(element.id);
      setTool('select');
      return;
    }
    setSelectedId(null);
    setConnectFrom(null);
  };

  const handlers = {
    select: (e, el) => {
      e.cancelBubble = true;
      if (tool === 'connector' && el.type !== 'connector') {
        if (!connectFrom) setConnectFrom(el.id);
        else if (connectFrom !== el.id) {
          commit({ type: 'add', element: { id: uid(), type: 'connector', from: connectFrom, to: el.id, stroke: '#5f6368' } });
          setConnectFrom(null);
        }
        return;
      }
      if (tool === 'select') setSelectedId(el.id);
    },
    dragMove: (el, node) => {
      const element = { id: el.id, x: node.x(), y: node.y() };
      setElements((els) => applyOp(els, { type: 'update', element }));
      emitMove(element);
    },
    dragEnd: (el, node) => {
      const element = { id: el.id, x: node.x(), y: node.y() };
      setElements((els) => applyOp(els, { type: 'update', element }));
      emitOp({ type: 'update', element });
    },
    transformEnd: (el, node) => {
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const element = { id: el.id, x: node.x(), y: node.y() };
      if (el.type === 'rect') Object.assign(element, { width: Math.max(40, el.width * sx), height: Math.max(30, el.height * sy) });
      if (el.type === 'circle') element.radius = Math.max(16, el.radius * Math.max(sx, sy));
      if (el.type === 'text') element.fontSize = Math.max(8, Math.round(el.fontSize * sy));
      commit({ type: 'update', element });
    },
    edit: (el, node) => {
      if (el.type === 'connector') return;
      const box = node.getClientRect();
      setSelectedId(el.id);
      setEditing({ id: el.id, box, value: el.text || '', type: el.type });
    },
  };

  const finishEditing = () => {
    if (editing) commit({ type: 'update', element: { id: editing.id, text: editing.value } });
    setEditing(null);
  };

  const onWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const p = stage.getPointerPosition();
    const old = view.scale;
    const scale = Math.min(3, Math.max(0.25, old * (e.evt.deltaY > 0 ? 1 / 1.08 : 1.08)));
    const anchor = { x: (p.x - view.x) / old, y: (p.y - view.y) / old };
    setView({ scale, x: p.x - anchor.x * scale, y: p.y - anchor.y * scale });
  };

  const zoomBy = (factor) =>
    setView((v) => {
      const scale = Math.min(3, Math.max(0.25, v.scale * factor));
      const cx0 = size.width / 2;
      const cy0 = size.height / 2;
      return { scale, x: cx0 - ((cx0 - v.x) / v.scale) * scale, y: cy0 - ((cy0 - v.y) / v.scale) * scale };
    });

  const clearAll = async () => {
    if (!window.confirm('Clear the whole canvas for everyone?')) return;
    try {
      await wsApi(currentId).put('/canvas', { elements: [] });
      setElements([]);
      setSelectedId(null);
    } catch (err) {
      toast(errorMessage(err), { error: true });
    }
  };

  const exportPng = () => {
    trRef.current?.nodes([]);
    const url = stageRef.current.toDataURL({ pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teamcollab-diagram.png';
    a.click();
  };

  const shapes = elements.filter((e) => e.type !== 'connector');
  const connectors = elements.filter((e) => e.type === 'connector');
  const cursor = { hand: 'grab', select: 'default', connector: 'crosshair' }[tool] || 'copy';

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pb-3 pt-6 sm:px-10">
        <div>
          <h1 className="text-[22px] font-normal text-ink">Design canvas</h1>
          <p className="text-[13px] text-ink-4">
            {tool === 'connector'
              ? connectFrom
                ? 'Now click the shape to connect to'
                : 'Click the first shape to connect'
              : 'ER diagrams & system architecture · double-click a shape to rename it'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AvatarStack users={online} size={28} />
          <button type="button" className="btn-outline" onClick={exportPng}><Download size={16} /> PNG</button>
          <button type="button" className="btn-text text-ink-3" onClick={clearAll}><Eraser size={16} /> Clear</button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative mx-6 mb-6 min-h-0 flex-1 overflow-hidden rounded-xl border border-line sm:mx-10"
        style={{
          backgroundColor: '#fbfbfc',
          backgroundImage: 'radial-gradient(#dadce0 1px, transparent 1px)',
          backgroundSize: `${22 * view.scale}px ${22 * view.scale}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
          cursor,
        }}
      >
        {/* Tool rail */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-lift">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              title={label}
              aria-label={label}
              onClick={() => {
                setTool(id);
                setConnectFrom(null);
              }}
              className={cx('flex h-9 w-9 items-center justify-center rounded-xl transition-colors', tool === id ? 'bg-gblue-soft text-gblue' : 'text-ink-3 hover:bg-surface')}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>

        {/* Selection properties */}
        {selected && tool === 'select' && (
          <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 shadow-lift">
            {selected.type !== 'text' &&
              SWATCHES.map((s) => (
                <button
                  key={s.stroke}
                  type="button"
                  aria-label="Set color"
                  onClick={() => commit({ type: 'update', element: { id: selected.id, ...(selected.type === 'connector' ? { stroke: s.stroke } : s) } })}
                  className={cx('h-6 w-6 rounded-full border-2', selected.stroke === s.stroke && 'ring-2 ring-offset-1 ring-gblue')}
                  style={{ background: selected.type === 'connector' ? s.stroke : s.fill, borderColor: s.stroke }}
                />
              ))}
            {selected.type === 'connector' && (
              <button
                type="button"
                className="chip ml-1 border border-line text-ink-3 hover:bg-surface"
                onClick={() => commit({ type: 'update', element: { id: selected.id, dashed: !selected.dashed } })}
              >
                {selected.dashed ? 'Solid' : 'Dashed'}
              </button>
            )}
            <div className="mx-1 h-5 w-px bg-line" />
            <button type="button" className="icon-btn h-8 w-8 hover:text-gred" onClick={deleteSelected} aria-label="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        )}

        {/* Zoom */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center rounded-full border border-line bg-white shadow-lift">
          <button type="button" className="icon-btn h-9 w-9" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out"><ZoomOut size={16} /></button>
          <button type="button" className="w-12 text-center text-xs text-ink-3" onClick={() => setView({ x: 0, y: 0, scale: 1 })} title="Reset view">
            {Math.round(view.scale * 100)}%
          </button>
          <button type="button" className="icon-btn h-9 w-9" onClick={() => zoomBy(1.2)} aria-label="Zoom in"><ZoomIn size={16} /></button>
        </div>

        {elements.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm text-ink-4">
            <div>
              <p className="text-base text-ink-3">Your canvas is empty</p>
              <p className="mt-1">Pick the rectangle or circle tool and click anywhere to start a diagram.</p>
            </div>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={view.x}
          y={view.y}
          scaleX={view.scale}
          scaleY={view.scale}
          draggable={tool === 'hand'}
          onDragEnd={(e) => e.target === e.target.getStage() && setView((v) => ({ ...v, x: e.target.x(), y: e.target.y() }))}
          onMouseDown={onStageMouseDown}
          onTouchStart={onStageMouseDown}
          onWheel={onWheel}
          onMouseMove={() => {
            const p = pointer();
            if (p) emitCursor({ x: p.x, y: p.y });
          }}
        >
          <Layer>
            {connectors.map((el) => (
              <Connector key={el.id} el={el} byId={byId} selected={el.id === selectedId} onSelect={handlers.select} />
            ))}
            {shapes.map((el) => (
              <ShapeNode key={el.id} el={el} draggable={tool === 'select'} highlighted={el.id === connectFrom} handlers={handlers} />
            ))}
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              ignoreStroke
              anchorSize={8}
              anchorCornerRadius={4}
              borderStroke="#1a73e8"
              anchorStroke="#1a73e8"
              keepRatio={selected?.type !== 'rect'}
              enabledAnchors={selected?.type === 'rect' ? ALL_ANCHORS : CORNER_ANCHORS}
              boundBoxFunc={(oldBox, newBox) => (newBox.width < 24 || newBox.height < 16 ? oldBox : newBox)}
            />
          </Layer>
          <Layer listening={false}>
            {Object.values(cursors).map((c) => (
              <RemoteCursor key={c.user._id} cursor={c} scale={view.scale} />
            ))}
          </Layer>
        </Stage>

        {editing && (
          <textarea
            autoFocus
            value={editing.value}
            onChange={(e) => setEditing((ed) => ({ ...ed, value: e.target.value }))}
            onBlur={finishEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                finishEditing();
              }
              if (e.key === 'Escape') setEditing(null);
            }}
            className="absolute z-20 resize-none rounded-md border-2 border-gblue bg-white/95 p-2 text-center text-sm text-ink shadow-lift outline-none"
            style={{
              left: editing.box.x,
              top: editing.box.y,
              width: Math.max(140, editing.box.width),
              height: Math.max(48, editing.box.height),
            }}
          />
        )}
      </div>
    </div>
  );
}
