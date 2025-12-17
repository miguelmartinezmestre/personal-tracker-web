import { SettingsLayout as SettingsLayoutComponent } from '@/components/settings-layout';

// No need to check authentication here - it's already checked in dashboard/layout.tsx
// via AuthenticatedView component
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    return <SettingsLayoutComponent>{children}</SettingsLayoutComponent>;
}
