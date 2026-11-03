/**
 * Select — Design.md § 7 Component Language > Dropdowns and selects  *(derived)*
 *
 * "A select is an input with a trailing chevron (16px). The menu is a
 *  `surface` panel with 1px `border`, `radius-md`, `shadow-raised`, items 40px
 *  tall with `radius-sm`, hover `surface-subtle`, current item marked with a
 *  `brand` check. Menus open on click, never on hover; Escape closes; arrow
 *  keys move."
 *
 * Trigger-nya memakai anatomi Input yang sama (h-10, radius-sm,
 * border-control) supaya select dan text field terbaca satu keluarga.
 */
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/shared/lib/cn";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-10 w-full items-center justify-between gap-2 rounded-sm border border-border-control bg-surface px-3",
        "text-input text-ink data-[placeholder]:text-ink-muted",
        "transition-[color,border-color,box-shadow] duration-150 ease-out",
        "hover:border-ink-secondary",
        "focus-visible:border-focus focus-ring",
        "disabled:cursor-not-allowed disabled:border-border-strong disabled:bg-surface-subtle disabled:text-ink-disabled",
        "aria-invalid:border-error",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-ink-secondary" aria-hidden />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

/** Panel menu bersama untuk Select dan DropdownMenu. */
const menuPanelClasses = [
  "z-overlay min-w-[8rem] overflow-hidden rounded-md border border-border bg-surface p-1 shadow-raised",
  "duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
];

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        className={cn(
          menuPanelClasses,
          position === "popper" && "data-[side=bottom]:mt-2 data-[side=top]:mb-2",
          className,
        )}
        {...props}
      >
        <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-ink-muted">
          <ChevronUp className="size-4" aria-hidden />
        </SelectPrimitive.ScrollUpButton>

        <SelectPrimitive.Viewport className="w-full min-w-[var(--radix-select-trigger-width)]">
          {children}
        </SelectPrimitive.Viewport>

        <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-ink-muted">
          <ChevronDown className="size-4" aria-hidden />
        </SelectPrimitive.ScrollDownButton>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("px-3 py-2 text-overline text-ink-muted uppercase", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        // Item 40px (space-10), radius-sm, hover surface-subtle.
        "relative flex h-10 cursor-default items-center rounded-sm pr-3 pl-9 text-input text-ink outline-none select-none",
        "focus:bg-surface-subtle data-[highlighted]:bg-surface-subtle",
        "data-[disabled]:pointer-events-none data-[disabled]:text-ink-disabled",
        className,
      )}
      {...props}
    >
      {/* Item terpilih ditandai check brand. */}
      <span className="absolute left-3 inline-flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4 text-brand" aria-hidden />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>) {
  return <SelectPrimitive.Separator className={cn("my-1 h-px bg-border", className)} {...props} />;
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  menuPanelClasses,
};
