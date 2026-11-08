import { Link } from 'react-router-dom';
import { JsonLd } from './JsonLd';
import { breadcrumbSchema } from '../../seo/schema/breadcrumb';

interface BreadcrumbsProps {
  items: { name: string; path: string }[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems = [{ name: 'Home', path: '/' }, ...items];

  return (
    <>
      <JsonLd data={breadcrumbSchema(allItems)} />
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {allItems.map((item, i) => (
            <li key={item.path} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-slate-600 select-none">/</span>}
              {i === allItems.length - 1 ? (
                <span className="text-blue-400 font-semibold" aria-current="page">
                  {item.name}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="hover:text-white transition-colors text-slate-400 hover:underline"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
