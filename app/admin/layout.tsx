import AdminNav from "@/components/admin/AdminNav";
import { ToastProvider } from "@/components/admin/Toaster";

// Every /admin page: a side navigation to move between them, and toast notifications for the client components
// (useToast). The page itself sits to the right of the navigation (above it on narrow screens).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <AdminNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ToastProvider>
  );
}
