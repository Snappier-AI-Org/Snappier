import { SidebarTrigger } from "@/components/ui/sidebar";

export const AppHeader = () => {
  return (
    <header className="flex h-14 md:h-16 lg:h-18 shrink-0 items-center gap-2 md:gap-4 border-b px-4 md:px-6 lg:px-8 bg-background">
      <SidebarTrigger className="size-8 md:size-9 lg:size-10" />
    </header>
  );
};