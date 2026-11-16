
import Link from "next/link";
import {
  ArrowUpRight,
  Users,
  Package,
  ShoppingCart,
  Truck,
  Landmark,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { erpModules } from "@/lib/erp-modules";

const moduleIcons = {
  administration: Users,
  inventory: Package,
  sales: ShoppingCart,
  "purchase-procurement": Truck,
  accounting: Landmark,
  reports: BarChart3,
};

export default function ModulesPage() {
  return (
    <div
      className="mx-auto w-full max-w-7xl space-y-7 pb-10"
      style={{ color: "var(--erp-text)" }}
    >
      <div>
        <div
          className="mb-2 flex items-center gap-2 text-sm"
          style={{ color: "var(--erp-muted)" }}
        >
          <Link href="/dashboard" className="hover:opacity-70">
            Dashboard
          </Link>
          <ChevronRight size={15} />
          <span style={{ color: "var(--erp-text)" }}>
            Modules
          </span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          ERP Modules
        </h1>

        <p
          className="mt-2 text-sm"
          style={{ color: "var(--erp-muted)" }}
        >
          Select a module to access its sections and business operations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {erpModules.map((module, index) => {
          const ModuleIcon =
            moduleIcons[module.id] || Package;

          const sectionCount = Array.isArray(module.sections)
            ? module.sections.length
            : 0;

          const pageCount = Array.isArray(module.sections)
            ? module.sections.reduce(
                (total, section) =>
                  total +
                  (Array.isArray(section.items)
                    ? section.items.length
                    : 0),
                0
              )
            : 0;

          return (
            <Link
              key={module.id}
              href={`/dashboard/modules/${module.id}`}
              className="group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{
                backgroundColor: "var(--erp-surface)",
                borderColor: "var(--erp-border)",
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-[0.04] transition-all duration-500 group-hover:scale-150 group-hover:opacity-10"
                style={{
                  backgroundColor: "var(--erp-primary)",
                }}
              />

              <div className="relative flex items-start justify-between">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: "var(--erp-blue-light)",
                    color: "var(--erp-primary)",
                  }}
                >
                  <ModuleIcon size={28} strokeWidth={1.8} />
                </div>

                <span
                  className="rounded-full border px-3 py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--erp-page)",
                    borderColor: "var(--erp-border)",
                    color: "var(--erp-muted)",
                  }}
                >
                  {sectionCount} sections
                </span>
              </div>

              <div className="relative mt-6 flex-1">
                <h2 className="text-xl font-bold tracking-tight">
                  {module.name}
                </h2>

                <p
                  className="mt-2 text-sm leading-6"
                  style={{ color: "var(--erp-muted)" }}
                >
                  Explore {module.name.toLowerCase()} sections and
                  available ERP operations.
                </p>

                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--erp-muted)" }}
                >
                  {pageCount} available navigation entries
                </p>
              </div>

              <div
                className="relative mt-5 flex items-center justify-between border-t pt-4"
                style={{ borderColor: "var(--erp-border)" }}
              >
                <span
                  className="flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--erp-primary)" }}
                >
                  Open module
                  <ChevronRight size={17} />
                </span>

                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:translate-x-1"
                  style={{
                    backgroundColor: "var(--erp-blue-light)",
                    color: "var(--erp-primary)",
                  }}
                >
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
