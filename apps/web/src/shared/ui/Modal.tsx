import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";

type ModalProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export function Modal({ title, children, onClose }: ModalProps) {
  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent className="mx-auto w-full max-w-lg">
        <section className="grid gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle>{title}</DrawerTitle>
            <button
              type="button"
              className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-inq-ink-soft hover:bg-inq-surface hover:text-inq-ink focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2 active:scale-[0.98]"
              onClick={onClose}
              aria-label="닫기"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {children}
        </section>
      </DrawerContent>
    </Drawer>
  );
}
