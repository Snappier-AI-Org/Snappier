import { AppHeader } from "@/components/app-header";

const Layout = ({ children }: { children: React.ReactNode; }) => {
    return (
    <>
        <AppHeader />
        <main className="flex-1 min-h-0 overflow-auto">{children}</main>
    </>
    );
};

export default Layout;