type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3">
      <div className="grid min-w-0 gap-1">
        <h1 className="m-0 text-[28px] font-extrabold leading-[1.25] tracking-[-0.03em] text-inq-ink text-balance">
          {title}
        </h1>
        {description ? (
          <p className="m-0 text-sm font-medium leading-[1.45] text-inq-ink-soft">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
