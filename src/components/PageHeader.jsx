export default function PageHeader({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-5 pt-8 sm:px-10">
      <div>
        <h1 className="text-[26px] font-normal text-ink">{title}</h1>
        {sub && <p className="mt-0.5 text-[15px] font-light text-ink-4">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
