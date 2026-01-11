import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { cookies, headers } from "next/headers";
import type React from "react";

async function attributeReferralFromCookie() {
    const cookieStore = await cookies();
    const ref = cookieStore.get("ref_code")?.value;
    if (!ref) return;

    const session = await auth.api.getSession({
        headers: await headers(),
    });

    const userId = session?.user?.id;
    if (!userId) return;

    const referrer = await prisma.user.findUnique({
        where: { referralCode: ref },
        select: { id: true },
    });

    if (!referrer || referrer.id === userId) return;

    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { referredById: true },
    });

    if (currentUser?.referredById) return;

    await prisma.user.update({
        where: { id: userId },
        data: { referredById: referrer.id },
    });

    await prisma.referralClick.updateMany({
        where: {
            referrerId: referrer.id,
            convertedToSignup: false,
            convertedUserId: null,
        },
        data: {
            convertedToSignup: true,
            convertedUserId: userId,
        },
    });
}

const Layout = async ({ children }: { children: React.ReactNode }) => {
    await attributeReferralFromCookie();

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-accent/20">
                {children}
            </SidebarInset>
        </SidebarProvider>
    );
};

export default Layout;