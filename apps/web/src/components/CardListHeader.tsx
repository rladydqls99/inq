type CardListHeaderProps = {
  context: string;
  title: string;
  meta: string;
  action?: React.ReactNode;
};

export function CardListHeader({
  context,
  title,
  meta,
  action,
}: CardListHeaderProps) {
  return (
    <header className="card-list-header">
      <p className="card-list-header__context">{context}</p>
      <div className="card-list-header__main">
        <div className="card-list-header__copy">
          <h1>{title}</h1>
          <p>{meta}</p>
        </div>
        {action ? <div className="card-list-header__action">{action}</div> : null}
      </div>
    </header>
  );
}
