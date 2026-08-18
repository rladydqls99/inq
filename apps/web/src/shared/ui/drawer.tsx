import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";

import { cn } from "@/shared/lib/utils";

function Drawer({
  swipeDirection = "down",
  ...props
}: DrawerPrimitive.Root.Props) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      swipeDirection={swipeDirection}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  ...props
}: DrawerPrimitive.Popup.Props) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/45 supports-[-webkit-touch-callout:none]:absolute" />
      <DrawerPrimitive.Viewport className="pointer-events-none fixed inset-0 z-50">
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "pointer-events-auto fixed inset-x-0 bottom-0 flex max-h-[calc(100dvh-2rem)] flex-col rounded-t-xl border-t border-inq-line bg-inq-canvas text-inq-ink outline-none [transform:translate3d(0,var(--drawer-swipe-movement-y),0)] data-ending-style:translate-y-full data-starting-style:translate-y-full",
            className,
          )}
          {...props}
        >
          <DrawerPrimitive.Content className="min-h-0 overflow-auto overscroll-contain">
            <div
              className="mx-auto mt-2 h-1 w-10 rounded-full bg-inq-line"
              aria-hidden="true"
            />
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      className={cn("text-xl font-bold tracking-[-0.015em]", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      className={cn("text-sm text-inq-ink-soft", className)}
      {...props}
    />
  );
}

export { Drawer, DrawerContent, DrawerDescription, DrawerTitle };
