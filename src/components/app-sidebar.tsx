"use client";

import {
  CreditCardIcon,
  FolderOpenIcon,
  Gift,
  HistoryIcon,
  KeyIcon,
  LayoutTemplateIcon,
  LogOutIcon,
  ShoppingBagIcon,
  Sparkles,
  Wallet,
  ChevronRight,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import NextImage from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { memo, useCallback } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useHasActiveSubscription } from "@/features/subscriptions/use-subscriptions";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Workspace",
    items: [
      {
        title: "Workflows",
        icon: FolderOpenIcon,
        url: "/workflows",
        description: "Manage automations",
      },
      {
        title: "Credentials",
        icon: KeyIcon,
        url: "/credentials",
        description: "API keys & connections",
      },
      {
        title: "Executions",
        icon: HistoryIcon,
        url: "/executions",
        description: "Run history",
      },
    ],
  },
  // Hidden: Templates section
  // {
  //   title: "Templates",
  //   items: [
  //     {
  //       title: "My Templates",
  //       icon: LayoutTemplateIcon,
  //       url: "/templates",
  //       description: "Your saved templates",
  //     },
  //     {
  //       title: "Marketplace",
  //       icon: ShoppingBagIcon,
  //       url: "/marketplace",
  //       description: "Browse community",
  //     },
  //   ],
  // },
  // Hidden: Earnings section
  // {
  //   title: "Earnings",
  //   items: [
  //     {
  //       title: "Referrals",
  //       icon: Gift,
  //       url: "/referrals",
  //       description: "Invite & earn",
  //     },
  //     {
  //       title: "Earnings",
  //       icon: Wallet,
  //       url: "/earnings",
  //       description: "Your revenue",
  //     },
  //   ],
  // },
];

export const AppSidebar = memo(() => {
const router = useRouter();
const pathname = usePathname();
const { hasActiveSubscription, isLoading } = useHasActiveSubscription();
const { state } = useSidebar();
const isCollapsed = state === "collapsed";

  const handleCheckout = useCallback(() => {
    authClient.checkout({ slug: "pro" });
  }, []);

  const handlePortal = useCallback(() => {
    authClient.customer.portal();
  }, []);

  const handleSignOut = useCallback(() => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  }, [router]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/50">
        <SidebarHeader className="pb-2">
            <SidebarMenuItem>
                <SidebarMenuButton asChild className="gap-x-3 h-12 px-3 hover:bg-transparent">
                    <Link href="/" prefetch className="group">
                        <div className="relative flex items-center justify-center size-8 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                            <NextImage 
                                src="/logos/logo.svg" 
                                alt="Snappier" 
                                width={20} 
                                height={20}
                            />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="font-semibold text-sm">Snappier</span>
                            <span className="text-[10px] text-muted-foreground">Workflow Automation</span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarHeader>

        <SidebarSeparator className="mx-3" />

        <SidebarContent className="px-2">
            {menuItems.map((group, groupIdx) => (
                <SidebarGroup key={group.title} className={cn(groupIdx > 0 && "pt-2")}>
                    <SidebarGroupLabel className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider px-3 mb-1">
                        {group.title}
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="gap-0.5">
                            {group.items.map((item) => {
                                const isActive = item.url === "/" 
                                    ? pathname === "/" 
                                    : pathname.startsWith(item.url);
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={isActive}
                                            asChild
                                            className={cn(
                                                "gap-x-3 h-10 px-3 rounded-lg transition-all duration-200",
                                                isActive 
                                                    ? "bg-primary/10 text-primary font-medium" 
                                                    : "hover:bg-accent/50"
                                            )}
                                        >
                                            <Link href={item.url} prefetch={true}>
                                                <item.icon className={cn(
                                                    "size-4 shrink-0",
                                                    isActive && "text-primary"
                                                )}/>
                                                <span className="flex-1">{item.title}</span>
                                                {isActive && (
                                                    <ChevronRight className="size-3 text-primary/70" />
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            ))}
        </SidebarContent>

        <SidebarFooter className="p-3 space-y-2">
            {/* Upgrade Banner for Free Users - Hidden when collapsed */}
            {!hasActiveSubscription && !isLoading && !isCollapsed && (
                <div 
                    onClick={handleCheckout}
                    className="group relative overflow-hidden rounded-xl bg-linear-to-br from-primary/20 via-primary/10 to-transparent p-4 cursor-pointer hover:from-primary/30 hover:via-primary/15 transition-all duration-300 border border-primary/20"
                >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
                    <div className="relative">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="size-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">Upgrade to Pro</span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                            Unlock unlimited workflows & premium features
                        </p>
                        <div className="flex items-center gap-1 text-xs text-primary font-medium group-hover:gap-2 transition-all">
                            <Zap className="size-3" />
                            <span>Get Started</span>
                            <ChevronRight className="size-3" />
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade icon button when collapsed */}
            {!hasActiveSubscription && !isLoading && isCollapsed && (
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Upgrade to Pro"
                        className="gap-x-3 h-9 px-3 text-primary hover:bg-primary/10 rounded-lg"
                        onClick={handleCheckout}
                    >
                        <Sparkles className="size-4"/>
                        <span>Upgrade</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            {/* Pro Badge for Pro Users - Hidden when collapsed */}
            {hasActiveSubscription && !isLoading && !isCollapsed && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10">
                    <Sparkles className="size-4 text-primary" />
                    <span className="text-sm font-medium">Pro Plan</span>
                    <Badge variant="secondary" className="ml-auto text-[10px] bg-primary/20 text-primary border-0">
                        Active
                    </Badge>
                </div>
            )}

            {/* Pro icon when collapsed */}
            {hasActiveSubscription && !isLoading && isCollapsed && (
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Pro Plan Active"
                        className="gap-x-3 h-9 px-3 text-primary hover:bg-primary/10 rounded-lg"
                    >
                        <Sparkles className="size-4"/>
                        <span>Pro</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}

            <SidebarSeparator />

            <SidebarMenu className="gap-0.5">
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Billing Portal"
                        className="gap-x-3 h-9 px-3 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-lg"
                        onClick={handlePortal}
                    >
                        <CreditCardIcon className="size-4"/>
                        <span>Billing</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Sign out"
                        className="gap-x-3 h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        onClick={handleSignOut}
                    >
                        <LogOutIcon className="size-4"/>
                        <span>Sign out</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <ThemeToggle />
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  );
});

AppSidebar.displayName = "AppSidebar";
