import Link from "next/link";
import { requireProfile, ROLE_LABELS, type Role } from "@/lib/auth";
import SignOutButton from "./sign-out-button";

const NAV: { href: string; label: string; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["hr_admin", "hr_officer", "canteen_user", "department_head", "payroll_user", "management"] },
  { href: "/employees", label: "Employee Master", roles: ["hr_admin", "hr_officer"] },
  { href: "/biometric/upload", label: "Biometric Upload", roles: ["hr_admin", "hr_officer"] },
  { href: "/headcount", label: "Headcount Verification", roles: ["hr_admin", "hr_officer", "department_head"] },
  { href: "/tickets", label: "Canteen Tickets", roles: ["hr_admin", "hr_officer"] },
  { href: "/canteen/scan", label: "Canteen Scan", roles: ["hr_admin", "canteen_user"] },
  { href: "/reconciliation", label: "Reconciliation", roles: ["hr_admin", "hr_officer", "canteen_user", "management"] },
  { href: "/payroll", label: "Payroll Attendance", roles: ["hr_admin", "payroll_user"] },
  { href: "/users", label: "Users & Roles", roles: ["hr_admin"] },
  { href: "/audit", label: "Audit Log", roles: ["hr_admin"] },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  const items = NAV.filter((n) => n.roles.includes(profile.role));

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <div className="font-semibold">Sky HR</div>
          <div className="text-xs text-slate-500">
            {profile.full_name} · {ROLE_LABELS[profile.role]}
          </div>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-2 border-t border-slate-100 mt-2">
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
