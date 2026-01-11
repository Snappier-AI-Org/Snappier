import { CredentialForm } from "@/features/credentials/components/credential";
import { requireAuth } from "@/lib/auth-utils";
import { CredentialType } from "@/generated/prisma";

interface PageProps {
    searchParams: Promise<{ type?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
    await requireAuth();
    const params = await searchParams;
    
    // Validate that the type is a valid CredentialType
    const preselectedType = params.type && Object.values(CredentialType).includes(params.type as CredentialType)
        ? (params.type as CredentialType)
        : undefined;
    
    return (
        <div className="p-4 md:px-10 md:py-6 h-full">
            <div className="mx-auto max-w-3xl w-full flex flex-col gap-y-8 h-full">
                <CredentialForm preselectedType={preselectedType} />
            </div>
        </div>
    );
}

export default Page;