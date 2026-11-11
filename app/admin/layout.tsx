import { ToastProvider } from "@/components/admin/Toaster";

// Every /admin page: toast notifications are available to all of its client components (useToast).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
