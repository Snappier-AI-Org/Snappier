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
  StarIcon,
  Wallet,
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useHasActiveSubscription } from "@/features/subscriptions/use-subscriptions";

const menuItems = [
  {
    title: "Main",
    items: [
      {
        title: "Workflows",
        icon: FolderOpenIcon,
        url: "/workflows",
      },
      {
        title: "Credentials",
        icon: KeyIcon,
        url: "/credentials",
      },
      {
        title: "Executions",
        icon: HistoryIcon,
        url: "/executions",
      },
    ],
  },
  {
    title: "Templates",
    items: [
      {
        title: "My Templates",
        icon: LayoutTemplateIcon,
        url: "/templates",
      },
      {
        title: "Marketplace",
        icon: ShoppingBagIcon,
        url: "/marketplace",
      },
    ],
  },
  {
    title: "Earn",
    items: [
      {
        title: "Referrals",
        icon: Gift,
        url: "/referrals",
      },
      {
        title: "Earnings",
        icon: Wallet,
        url: "/earnings",
      },
    ],
  },
];

export const AppSidebar = memo(() => {
const router = useRouter();
const pathname = usePathname();
const { hasActiveSubscription, isLoading } = useHasActiveSubscription();

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
    <Sidebar collapsible="icon">
        <SidebarHeader>
            <SidebarMenuItem>
                    <SidebarMenuButton asChild className="gap-x-4 h-10 px-4">
                        <Link href="/" prefetch>
                        <NextImage 
                          src="/logos/logo.svg" 
                          alt="ChatToFlow" 
                          width={24} 
                          height={24}
                          // className="shrink-0 size-6"
                        />
                        <span className="font-semibold text-sm">ChatToFlow</span>
                        </Link>
                    </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarHeader>
      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupContent>
                <SidebarMenu>
                    {group.items.map((item) => (
                        <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            tooltip={item.title}
                            isActive={
                                item.url === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.url)
                            }
                            asChild
                            className="gap-x-4 h-10 px-4"
                        >
                            <Link 
                              href={item.url} 
                              prefetch={true}
                            >
                            <item.icon className="size-4"/>
                            <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
      </SidebarGroup>
    ))}
  </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
              {!hasActiveSubscription && !isLoading && (
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Upgrade to Pro"
                        className="gap-x-4 h-10 px-4"
                        onClick={handleCheckout}
                        >
                        <StarIcon className="h-4 w-4"/>
                        <span>Upgrade to Pro</span>
                        </SidebarMenuButton>
                </SidebarMenuItem>
              )}
                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Billing Portal"
                        className="gap-x-4 h-10 px-4"
                        onClick={handlePortal}
                        >
                        <CreditCardIcon className="h-4 w-4"/>
                        <span>Billing Portal</span>
                        </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                    <SidebarMenuButton
                        tooltip="Sign out"
                        className="gap-x-4 h-10 px-4"
                        onClick={handleSignOut}
                        >
                        <LogOutIcon className="h-4 w-4"/>
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
