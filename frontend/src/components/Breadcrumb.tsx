import { Link } from "react-router-dom";

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: Props) {
  if (!items.length) return null;

  return (
    <nav className="breadcrumb-nav" aria-label="Fil d'Ariane">
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="breadcrumb-item">
            {index > 0 ? (
              <span className="breadcrumb-sep" aria-hidden="true">
                /
              </span>
            ) : null}
            {item.to ? (
              <Link to={item.to} className="breadcrumb-link">
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-current">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
