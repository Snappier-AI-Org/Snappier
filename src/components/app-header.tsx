"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  workflows: "Workflows",
  credentials: "Credentials",
  executions: "Executions",
  templates: "My Templates",
  marketplace: "Marketplace",
  referrals: "Referrals",
  earnings: "Earnings",
  new: "New",
};

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string; isLast: boolean }[] = [];

  let currentPath = "";
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const label = routeLabels[segment] || segment;
    breadcrumbs.push({
      label,
      href: currentPath,
      isLast: index === segments.length - 1,
    });
  });

  return breadcrumbs;
}

export const AppHeader = () => {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-14 md:h-16 shrink-0 items-center gap-3 border-b border-border/50 px-4 md:px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <SidebarTrigger className="size-8 md:size-9 hover:bg-accent/50 transition-colors rounded-lg" />
      
      <Separator orientation="vertical" className="h-5 bg-border/50" />
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Link 
          href="/" 
          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="size-4" />
          <span className="sr-only">Home</span>
        </Link>
        
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
            {crumb.isLast ? (
              <span className="font-medium text-foreground truncate max-w-[150px] md:max-w-[200px]">
                {crumb.label}
              </span>
            ) : (
              <Link 
                href={crumb.href}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-colors truncate max-w-[100px] md:max-w-[150px]"
                )}
              >
                {crumb.label}
              </Link>
            )}
          </div>
        ))}
      </nav>
    </header>
  );
};