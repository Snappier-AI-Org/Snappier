import { AlertTriangleIcon, Loader2Icon, MoreVerticalIcon, PackageOpenIcon, PlusIcon, SearchIcon, TrashIcon, Sparkles } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import Link from "next/link";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./ui/empty";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import React, { useCallback } from "react";

type EntityHeaderProps = {
  title: string;
  description?: string;
  newButtonLabel?: string;
  disabled?: boolean;
  isCreating?: boolean;
} & (
  | { onNew: () => void; newButtonHref?: never }
  | { newButtonHref: string; onNew?: never }
  | { onNew?: never; newButtonHref?: never }
);
export const EntityHeader = ({
  title,
  description,
  onNew,
  newButtonHref,
  newButtonLabel,
  disabled,
  isCreating,
}: EntityHeaderProps) => {
  return (
    <div className="flex flex-row items-center justify-between gap-x-4 md:gap-x-6 lg:gap-x-8">
      <div className="flex flex-col gap-y-1">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">{title}</h1>
        {description && (
            <p className="text-sm md:text-base text-muted-foreground">
            {description}
            </p>
        )}
      </div>
        {(onNew && !newButtonHref) && (
            <Button 
                disabled={isCreating || disabled} 
                size="default"
                className="h-10 md:h-11 px-4 md:px-5 font-medium shadow-sm hover:shadow-md transition-all"
                onClick={onNew}
                >
                <PlusIcon className="size-4 md:size-5" />
                <span className="hidden sm:inline">{newButtonLabel}</span>
            </Button>
        )}
        {(newButtonHref && !onNew) && (
            <Button 
                disabled={isCreating || disabled} 
                size="default"
                className="h-10 md:h-11 px-4 md:px-5 font-medium shadow-sm hover:shadow-md transition-all"
                onClick={onNew}
                asChild
                >
                <Link href={newButtonHref} prefetch>
                    <PlusIcon className="size-4 md:size-5" />
                    <span className="hidden sm:inline">{newButtonLabel}</span>
                </Link>
            </Button>
        )}
    </div>
  );
};


type EntityContainerProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  search?: React.ReactNode;
  pagination?: React.ReactNode;
};

export const EntityContainer = ({
    children,
    header,
    search,
    pagination,
}: EntityContainerProps) => {
    return (
    <div className="entity-container p-6 md:px-8 md:py-8 lg:px-12 lg:py-10 h-full">
        <div className="mx-auto max-w-6xl w-full flex flex-col gap-y-8 md:gap-y-10 h-full">
            {header}
        <div className="flex flex-col gap-y-6 h-full">
            {search}
            <div className="flex-1 min-h-0">
                {children}
            </div>
        </div>
        {pagination}
    </div>
    </div>
)};    

interface EntitySearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isSearching?: boolean;
}

export const EntitySearch = ({
  value,
  onChange,
  placeholder = "Search",
  isSearching = false,
}: EntitySearchProps) => {
  return (
      <div className="relative ml-auto">
        {isSearching ? (
          <Loader2Icon className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        ) : (
          <SearchIcon className="size-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          className="w-full max-w-xs md:max-w-sm bg-background/50 shadow-sm border-border/50 pl-11 h-10 md:h-11 text-sm focus-visible:bg-background focus-visible:border-primary/50 transition-all"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
    </div>
  );
};

interface EntityPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export const EntityPagination = ({
  page,
  totalPages,
  onPageChange,
  disabled,
}: EntityPaginationProps) => {
  const handlePrevious = useCallback(() => {
    onPageChange(Math.max(1, page - 1));
  }, [page, onPageChange]);

  const handleNext = useCallback(() => {
    onPageChange(Math.min(totalPages, page + 1));
  }, [page, totalPages, onPageChange]);

    return (
    <div className="flex items-center justify-between gap-x-4 w-full pt-6 border-t border-border/50">
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages || 1}</span>
      </p>
      <div className="flex items-center gap-x-2">
          <Button
            disabled={page === 1 || disabled}
            variant="outline"
            size="sm"
            className="h-9 px-4 hover:bg-accent/50"
            onClick={handlePrevious}
          >
            Previous
          </Button>
          <Button
            disabled={page === totalPages || totalPages === 0 || disabled}
            variant="outline"
            size="sm"
            className="h-9 px-4 hover:bg-accent/50"
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </div>
  )
};

interface StateViewProps {
  message?: string;
}

export const LoadingView = ({
  message,
}: StateViewProps) => {
  return (
    <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-4">
      <Loader2Icon className="size-6 animate-spin text-primary" />
      {!!message && (
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
      )}
    </div>
  );
};

export const SkeletonList = ({ count = 5 }: { count?: number }) => {
  return (
    <div className="flex flex-col gap-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="p-5 border border-border/50 rounded-xl bg-card/50">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-muted/70" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted/70 rounded w-2/3" />
                <div className="h-3 bg-muted/50 rounded w-1/3" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


export const ErrorView = ({
  message,
}: StateViewProps) => {
  return (
    <div className="flex justify-center items-center h-full flex-1 flex-col gap-y-4">
      <AlertTriangleIcon className="size-6 text-primary" />
      {!!message && (
      <p className="text-sm text-muted-foreground">
        {message}
      </p>
      )}
    </div>
  );
};

interface EmptyViewProps extends StateViewProps {
  onNew?: () => void;
}

export const EmptyView = ({
  message,
  onNew
}: EmptyViewProps) => {
  return (
        <Empty className="entity-empty border border-dashed border-border/50 bg-card/30 rounded-xl py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <div className="p-4 rounded-xl bg-primary/10">
                <PackageOpenIcon className="size-8 text-primary" />
              </div>
            </EmptyMedia>
          </EmptyHeader>
        <EmptyTitle className="text-lg font-semibold">
          No items yet
        </EmptyTitle>
        {!!message && (
        <EmptyDescription className="text-muted-foreground">
          {message}
        </EmptyDescription>
        )}
        {!!onNew && (
        <EmptyContent>
          <Button onClick={onNew} className="mt-4">
            <PlusIcon className="size-4 mr-2" />
            Add item
          </Button>
        </EmptyContent>
        )}
      </Empty>
  );
};

interface EntityListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey?: (item: T, index: number) => string | number;
  emptyView?: React.ReactNode;
  className?: string;
}

export function EntityList<T>({
  items,
  renderItem,
  getKey,
  emptyView,
  className,
}: EntityListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="max-w-sm mx-auto">{emptyView}</div>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col gap-y-4",
      className,
    )}>
      {items.map((item, index) => (
        <div key={getKey ? getKey(item, index) : index}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  )
}

interface EntityItemProps {
  href: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  image?: React.ReactNode;
  actions?: React.ReactNode;
  menuItems?: React.ReactNode;
  onRemove?: () => void | Promise<void>;
  isRemoving?: boolean;
  className?: string;
};

export const EntityItem = ({
  href,
  title,
  subtitle,
  image,
  actions,
  menuItems,
  onRemove,
  isRemoving,
  className,
}: EntityItemProps) => {
  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isRemoving) {
      return;
    }  

    if (onRemove) {
      await onRemove();
    }
}
  return (
    <Link href={href} prefetch>
      <Card
      className={cn(
        "entity-item p-4 md:p-5 border-border/50 bg-card/50 hover:bg-card hover:border-border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group rounded-xl",
        isRemoving && "opacity-50 cursor-not-allowed",
        className,
      )}
      > 
      <CardContent className="flex flex-row items-center justify-between p-0 gap-4 md:gap-5">
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {image && (
              <div className="shrink-0 flex items-center justify-center size-10 md:size-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors">
                {image}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base md:text-lg font-semibold truncate group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
              {!!subtitle && (
                <CardDescription className="text-sm text-muted-foreground mt-0.5 truncate">
                  {subtitle}
                </CardDescription>
              )}
            </div>
          </div>
              {(actions || onRemove) && (
                <div className="flex gap-x-2 items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {actions}
                  {onRemove && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-9 hover:bg-accent"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVerticalIcon className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {menuItems}
                        <DropdownMenuItem 
                          onClick={handleRemove}
                          disabled={isRemoving}
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          {isRemoving ? (
                            <>
                              <Loader2Icon className="size-4 animate-spin"/>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <TrashIcon className="size-4"/>
                              Delete
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>  
                  )}
                </div>
              )}
      </CardContent>
      </Card>
    </Link>
  )
};