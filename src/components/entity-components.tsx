import { AlertTriangleIcon, Loader2Icon, MoreVerticalIcon, PackageOpenIcon, PlusIcon, SearchIcon, TrashIcon } from "lucide-react";
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
        <h1 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-semibold">{title}</h1>
        {description && (
            <p className="text-xs md:text-sm lg:text-base text-muted-foreground">
            {description}
            </p>
        )}
      </div>
        {(onNew && !newButtonHref) && (
            <Button 
                disabled={isCreating || disabled} 
                size="sm"
                className="h-9 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 text-xs md:text-sm lg:text-base"
                onClick={onNew}
                >
                <PlusIcon className="size-4 md:size-5" />
                <span className="hidden sm:inline">{newButtonLabel}</span>
            </Button>
        )}
        {(newButtonHref && !onNew) && (
            <Button 
                disabled={isCreating || disabled} 
                size="sm"
                className="h-9 md:h-10 lg:h-11 px-3 md:px-4 lg:px-5 text-xs md:text-sm lg:text-base"
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
    <div className="entity-container p-4 md:px-8 md:py-6 lg:px-12 lg:py-8 xl:px-16 xl:py-10 h-full">
        <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-6 md:gap-y-8 lg:gap-y-10 h-full">
            {header}
        <div className="flex flex-col gap-y-4 md:gap-y-6 lg:gap-y-8 h-full">
            {search}
            {children}
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
          <Loader2Icon className="size-3.5 md:size-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        ) : (
          <SearchIcon className="size-3.5 md:size-4 absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
        className="max-w-[200px] md:max-w-[250px] lg:max-w-[300px] xl:max-w-[350px] bg-background shadow-none border-border pl-8 md:pl-10 h-9 md:h-10 lg:h-11 text-xs md:text-sm lg:text-base"
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
    <div className="flex items-center justify-between gap-x-4 md:gap-x-6 lg:gap-x-8 w-full pt-4 md:pt-6">
      <div className="flex-1 text-xs md:text-sm lg:text-base text-muted-foreground">
        Page {page} of {totalPages || 1}
      </div>
      <div className="flex items-center justify-end gap-x-2 md:gap-x-3">
          <Button
            disabled={page === 1 || disabled}
            variant="outline"
            size="sm"
            className="h-8 md:h-9 lg:h-10 px-3 md:px-4 lg:px-5 text-xs md:text-sm lg:text-base"
            onClick={handlePrevious}
          >
            Previous
          </Button>
          <Button
            disabled={page === totalPages || totalPages === 0 || disabled}
            variant="outline"
            size="sm"
            className="h-8 md:h-9 lg:h-10 px-3 md:px-4 lg:px-5 text-xs md:text-sm lg:text-base"
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
    <div className="flex flex-col gap-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <div className="size-8 rounded bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
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
        <Empty className="entity-empty border border-dashed bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageOpenIcon />
            </EmptyMedia>
          </EmptyHeader>
        <EmptyTitle>
          No items
        </EmptyTitle>
        {!!message && (
        <EmptyDescription>
          {message}
        </EmptyDescription>
        )}
        {!!onNew && (
        <EmptyContent>
          <Button onClick={onNew}>
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
        "entity-item p-4 md:p-5 lg:p-6 shadow-none hover:shadow-md transition-shadow cursor-pointer",
        isRemoving && "opacity-50 cursor-not-allowed",
        className,
      )}
      > 
      <CardContent className="flex flex-row items-center justify-between p-0 gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4 lg:gap-5 min-w-0 flex-1">
            {image}
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base md:text-lg lg:text-xl font-medium truncate">
                {title}
              </CardTitle>
              {!!subtitle && (
                <CardDescription className="text-xs md:text-sm lg:text-base mt-1">
                  {subtitle}
                </CardDescription>
              )}
            </div>
          </div>
              {(actions || onRemove) && (
                <div className="flex gap-x-2 md:gap-x-3 lg:gap-x-4 items-center shrink-0">
                  {actions}
                  {onRemove && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 md:size-9 lg:size-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVerticalIcon className="size-4 md:size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="min-w-[140px] md:min-w-[160px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {menuItems}
                        <DropdownMenuItem 
                          onClick={handleRemove}
                          disabled={isRemoving}
                          className="text-xs md:text-sm"
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