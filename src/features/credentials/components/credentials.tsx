"use client";

import { 
  EmptyView, 
  EntityContainer, 
  EntityHeader, 
  EntityItem, 
  EntityList, 
  EntityPagination, 
  EntitySearch, 
  ErrorView, 
  LoadingView,
  SkeletonList
} from "@/components/entity-components";
import { useRemoveCredential, useSuspenseCredentials } from "../hooks/use-credentials";
// import { Link, Router, CredentialIcon } from "lucide-react";
import { use, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCredentialsParams } from "../hooks/use-credentials-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { CredentialType } from "@/generated/prisma";
import type { Credential } from "@/generated/prisma";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

type CredentialListItem = Pick<Credential, "id" | "name" | "type" | "createdAt" | "updatedAt">;

export const CredentialsSearch = () => {
const [params, setParams] = useCredentialsParams();
const { searchValue, onSearchChange, isSearching } = useEntitySearch({
  params,
  setParams,
});

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search Credentials"
      isSearching={isSearching}
    />
  );
};

export const CredentialsList = () => {
  const credentials = useSuspenseCredentials();

  return (
    <EntityList
      items={credentials.data.items}
      getKey={(credential) => credential.id}
      renderItem={(credential) => <CredentialItem data={credential} />}
      emptyView={<CredentialsEmpty />}
    />
  );
};

export const CredentialsHeader = ({ disabled }: { disabled?: boolean }) => {

  return (
    <EntityHeader
      title="Credentials"
      description="Create and manage your credentials"
      newButtonHref="/credentials/new"
      newButtonLabel="New Credential"
      disabled={disabled}
    />
  );
};

export const CredentialsPagination = memo(() => {
  const credentials = useSuspenseCredentials();
  const [params, setParams] = useCredentialsParams();

  const handlePageChange = useCallback((page: number) => {
    setParams({ ...params, page });
  }, [params, setParams]);

  return (
    <EntityPagination
      disabled={credentials.isFetching}
      totalPages={credentials.data.totalPages}
      page={credentials.data.page}
      onPageChange={handlePageChange}
    />
  );
});

CredentialsPagination.displayName = "CredentialsPagination";

export const CredentialsContainer = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<CredentialsHeader />}
      search={<CredentialsSearch />}
      pagination={<CredentialsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const CredentialsLoading = () => {
  return <SkeletonList count={5} />;
};

export const CredentialsError = () => {
  return <ErrorView message="Error loading credentials" />;
};

export const CredentialsEmpty = () => {
  const router = useRouter();

  const handleCreate = () => {
    router.push(`/credentials/new`);
  };

  return (
    <EmptyView
      onNew={handleCreate}
      message="No credentials found. Get started by creating a credential"
    />
  )
}

const credentialLogos: Partial<Record<CredentialType, string>> = {
  [CredentialType.OPENAI]: "/logos/openai.svg",
  [CredentialType.ANTHROPIC]: "/logos/anthropic.svg",
  [CredentialType.GEMINI]: "/logos/gemini.svg",
  [CredentialType.GROQ]: "/logos/groq.svg",
  [CredentialType.HUGGINGFACE]: "/logos/huggingface.svg",
  [CredentialType.OPENROUTER]: "/logos/openrouter.png",
  [CredentialType.GOOGLE_DRIVE]: "/logos/google-drive.svg",
  [CredentialType.GOOGLE_SHEETS]: "/logos/google-sheets.svg",
  [CredentialType.GMAIL]: "/logos/gmail.svg",
  [CredentialType.GOOGLE_CALENDAR]: "/logos/google-calendar.svg",
  [CredentialType.GOOGLE_DOCS]: "/logos/google-docs.svg",
  [CredentialType.TRELLO]: "/logos/trello.svg",
  [CredentialType.OUTLOOK]: "/logos/outlook.svg",
  [CredentialType.NOTION]: "/logos/notion.svg",
  [CredentialType.GITHUB]: "/logos/github.svg",
  [CredentialType.TODOIST]: "/logos/todoist.svg",
};


export const CredentialItem = memo(({
  data,
}: {
  data: CredentialListItem;
}) => {
  const removeCredential = useRemoveCredential();
  const handleRemove = useCallback(() => {
    removeCredential.mutate({ id: data.id });
  }, [data.id, removeCredential]);

  const logo = credentialLogos[data.type] ?? "/logos/openai.svg";
  return (
    <EntityItem
      href={`/credentials/${data.id}`}
      title={data.name}
      subtitle={
        <>
          Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}{" "}
          &bull; Created{" "}
          {formatDistanceToNow(data.createdAt, { addSuffix: true })}
        </>
      }
      image={
        <div className="size-8 flex items-center justify-center">
            <Image 
              src={logo} 
              alt={data.type} 
              width={20} 
              height={20}
              style={{ width: 'auto', height: 'auto' }}
            />
        </div>
      }
      onRemove={handleRemove}
      isRemoving={removeCredential.isPending}
    />
  )
});

CredentialItem.displayName = "CredentialItem";