import { NotificationWorkspace } from "@/components/notifications/notification-center";
import { PageHeader } from "@/components/layout/page-header";

export default function NotificationsPage() {
  return <><PageHeader eyebrow="Notifications" title="Stay ahead of recruiting work" subtitle="Review important deadlines, completed analyses, follow-ups, and interview results." /><NotificationWorkspace /></>;
}
