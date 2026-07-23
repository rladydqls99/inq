type PageHeaderProps = {
  title: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {action ? <div className="page-header__action">{action}</div> : null}
    </header>
  );
}
