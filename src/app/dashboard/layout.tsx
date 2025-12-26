import { DashboardLayout } from "@/components/dashboard";
import { NotificationProvider } from "@/components/providers/NotificationContext";

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <NotificationProvider>
            <DashboardLayout>{children}</DashboardLayout>
        </NotificationProvider>
    );
}
