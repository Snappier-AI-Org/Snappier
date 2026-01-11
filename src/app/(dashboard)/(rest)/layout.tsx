import { AppHeader } from "@/components/app-header";

const Layout = ({ children }: { children: React.ReactNode; }) => {
    return (
        <div className="flex flex-col h-full min-h-svh">
            <AppHeader />
            <main className="flex-1 min-h-0 overflow-auto">{children}</main>
        </div>
    );
};

export default Layout;