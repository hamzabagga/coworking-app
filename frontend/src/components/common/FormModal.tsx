import Alert from "@/components/ui/alert/Alert";
import Button from "@/components/ui/button/Button";
import { Modal } from "@/components/ui/modal";
import type { FormEvent, ReactNode } from "react";

// modale du template contenant un formulaire avec boutons Annuler / Enregistrer
export default function FormModal({
  isOpen,
  onClose,
  title,
  error,
  submitting,
  onSubmit,
  submitLabel = "Enregistrer",
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  error?: string;
  submitting?: boolean;
  onSubmit: () => void;
  submitLabel?: string;
  children: ReactNode;
}) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-[640px]">
      <form
        onSubmit={handleSubmit}
        className="relative no-scrollbar w-full overflow-y-auto rounded-3xl bg-white p-4 lg:p-10 dark:bg-gray-900"
      >
        <h4 className="mb-6 pe-12 text-2xl font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h4>
        {error && (
          <div className="mb-5">
            <Alert variant="error" title="Erreur" message={error} />
          </div>
        )}
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {children}
        </div>
        <div className="mt-8 flex items-center gap-3 sm:justify-end">
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Enregistrement…" : submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
