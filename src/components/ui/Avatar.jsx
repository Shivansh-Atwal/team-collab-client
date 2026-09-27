import { initials, userColor, cx } from '../../lib/utils.js';

export default function Avatar({ user, size = 32, ring = false, online, className = '' }) {
  if (!user) return null;
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.4) };
  return (
    <span className={cx('relative inline-flex shrink-0', className)} title={user.name}>
      {user.avatar ? (
        <img src={user.avatar} alt={user.name} style={style} className={cx('rounded-full object-cover', ring && 'ring-2 ring-white')} />
      ) : (
        <span
          style={{ ...style, background: userColor(user._id) }}
          className={cx('inline-flex items-center justify-center rounded-full font-medium text-white', ring && 'ring-2 ring-white')}
        >
          {initials(user.name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cx('absolute bottom-0 right-0 rounded-full ring-2 ring-white', online ? 'bg-ggreen-light' : 'bg-ink-5')}
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </span>
  );
}

export function AvatarStack({ users = [], max = 4, size = 28 }) {
  const shown = users.slice(0, max);
  const rest = users.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((u) => (
        <Avatar key={u._id} user={u} size={size} ring />
      ))}
      {rest > 0 && (
        <span
          style={{ width: size, height: size }}
          className="inline-flex items-center justify-center rounded-full bg-surface text-[11px] font-medium text-ink-3 ring-2 ring-white"
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
