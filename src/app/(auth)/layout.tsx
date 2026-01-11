import { AuthorLayout } from "@/features/auth/components/auth-layout";

const Layout = ({ children }: { children: React.ReactNode; }) => {
  return (
    <AuthorLayout>
      {children}
    </AuthorLayout>
  );
};

export default Layout;