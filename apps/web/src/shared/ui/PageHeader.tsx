type PageHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-3">
      <h1 className="m-0 text-2xl font-bold tracking-normal">{title}</h1>
      {action ? <div>{action}</div> : null}
    </header>
  );
}
