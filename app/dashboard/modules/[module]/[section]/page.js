
import Link from "next/link";
import { notFound } from "next/navigation";
import { erpModules } from "@/lib/erp-modules";
import {
  ArrowUpRight,
  ChevronRight,
  FileText,
  LayoutGrid,
} from "lucide-react";

export default async function ModuleSectionPage({ params }) {
  const { module: moduleId, section: sectionId } = await params;

  const moduleConfig = erpModules.find(
    (item) => item.id === moduleId
  );

  if (!moduleConfig) notFound();

  const section = moduleConfig.sections?.find(
    (item) => item.id === sectionId
  );

  if (!section) notFound();

  const items = Array.isArray(section.items)
    ? section.items
    : [];

  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-6 pb-10"
      style={{ color: "var(--erp-text)" }}
    >
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-sm"
        style={{ color: "var(--erp-muted)" }}
      >
        <Link href="/dashboard" className="hover:opacity-75">
          Dashboard
        </Link>

        <ChevronRight size={15} />

        <Link
          href={`/dashboard/modules/${moduleConfig.id}`}
          className="hover:opacity-75"
        >
          {moduleConfig.name}
        </Link>

        <ChevronRight size={15} />

        <span
          className="font-semibold"
          style={{ color: "var(--erp-text)" }}
        >
          {section.name}
        </span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{
              backgroundColor: "var(--erp-blue-light)",
              color: "var(--erp-primary)",
            }}
          >
            <LayoutGrid size={23} />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {section.name}
            </h1>

            <p
              className="mt-1 text-sm"
              style={{ color: "var(--erp-muted)" }}
            >
              {moduleConfig.name} / {section.name}
            </p>
          </div>
        </div>

        <span
          className="rounded-full border px-3 py-1.5 text-xs font-semibold"
          style={{
            backgroundColor: "var(--erp-surface)",
            borderColor: "var(--erp-border)",
            color: "var(--erp-muted)",
          }}
        >
          {items.length} {items.length === 1 ? "page" : "pages"}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <Link
              key={`${item.name}:${item.href}`}
              href={item.href}
              className="group flex min-h-[125px] items-center gap-4 rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              style={{
                backgroundColor: "var(--erp-surface)",
                borderColor: "var(--erp-border)",
                animationDelay: `${index * 40}ms`,
              }}
            >
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: "var(--erp-blue-light)",
                  color: "var(--erp-primary)",
                }}
              >
                <FileText size={22} />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  className="text-sm font-bold transition-colors group-hover:text-blue-600"
                  style={{ color: "var(--erp-text)" }}
                >
                  {item.name}
                </h2>

                <p
                  className="mt-1 text-xs"
                  style={{ color: "var(--erp-muted)" }}
                >
                  Open {item.name}
                </p>
              </div>

              <ArrowUpRight
                size={19}
                className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                style={{ color: "var(--erp-primary)" }}
              />
            </Link>
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl border border-dashed p-10 text-center"
          style={{ borderColor: "var(--erp-border)" }}
        >
          <p className="text-sm" style={{ color: "var(--erp-muted)" }}>
            No pages are configured in this section.
          </p>
        </div>
      )}

      <Link
        href={`/dashboard/modules/${moduleConfig.id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-75"
        style={{ color: "var(--erp-primary)" }}
      >
        <ChevronRight className="rotate-180" size={16} />
        Back to {moduleConfig.name}
      </Link>
    </div>
  );
}
