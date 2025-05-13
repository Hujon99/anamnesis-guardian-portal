
/**
 * Breadcrumb component that provides hierarchical navigation structure
 * with support for multiple levels and active state styling.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronRight, Home } from "lucide-react"
import { Link } from "react-router-dom"

interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode
  children: React.ReactNode
}

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ separator = <ChevronRight className="h-4 w-4" />, className, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label="breadcrumb"
        className={cn("flex items-center text-sm text-muted-foreground", className)}
        {...props}
      />
    )
  }
)
Breadcrumb.displayName = "Breadcrumb"

interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<"ol"> {
  children: React.ReactNode
}

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => {
    return (
      <ol
        ref={ref}
        className={cn("flex items-center gap-1.5", className)}
        {...props}
      />
    )
  }
)
BreadcrumbList.displayName = "BreadcrumbList"

interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {
  children: React.ReactNode
}

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("flex items-center gap-1.5", className)}
        {...props}
      />
    )
  }
)
BreadcrumbItem.displayName = "BreadcrumbItem"

interface BreadcrumbSeparatorProps extends React.ComponentPropsWithoutRef<"li"> {
  children?: React.ReactNode
}

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ className, children = <ChevronRight className="h-4 w-4" />, ...props }, ref) => {
    return (
      <li
        ref={ref}
        aria-hidden="true"
        className={cn("text-muted-foreground", className)}
        {...props}
      >
        {children}
      </li>
    )
  }
)
BreadcrumbSeparator.displayName = "BreadcrumbSeparator"

interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  asChild?: boolean
  children: React.ReactNode
  isActive?: boolean
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ asChild, isActive, className, children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn(
          "transition-colors hover:text-foreground",
          isActive ? "font-semibold text-foreground pointer-events-none" : "text-muted-foreground hover:text-primary",
          className
        )}
        aria-current={isActive ? "page" : undefined}
        {...props}
      >
        {children}
      </Link>
    )
  }
)
BreadcrumbLink.displayName = "BreadcrumbLink"

const BreadcrumbPage = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn("font-normal text-foreground", className)}
      {...props}
    />
  )
})
BreadcrumbPage.displayName = "BreadcrumbPage"

const BreadcrumbEllipsis = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      role="presentation"
      aria-hidden="true"
      className={cn("flex h-9 w-9 items-center justify-center", className)}
      {...props}
    >
      &#8230;
    </span>
  )
})
BreadcrumbEllipsis.displayName = "BreadcrumbEllipsis"

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbEllipsis,
}
