import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/utils";
import type { ReactNode } from "react";

// tableau au style de BasicTableOne du template
export function DataTable({
  columns,
  children,
  empty,
  isEmpty,
}: {
  columns: string[];
  children: ReactNode;
  empty: string;
  isEmpty: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/5 dark:bg-white/3">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/5">
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column}
                  isHeader
                  className="px-5 py-3 text-start text-theme-xs font-medium whitespace-nowrap text-gray-500 dark:text-gray-400"
                >
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
            {children}
          </TableBody>
        </Table>
        {isEmpty && (
          <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            {empty}
          </p>
        )}
      </div>
    </div>
  );
}

export function Cell({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <TableCell
      className={cn(
        "px-5 py-4 text-start text-theme-sm whitespace-nowrap text-gray-500 dark:text-gray-400",
        className,
      )}
    >
      {children}
    </TableCell>
  );
}

// petit bouton texte pour les actions d'une ligne (modifier, supprimer…)
export function RowAction({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-theme-sm font-medium",
        danger
          ? "text-error-500 hover:text-error-600"
          : "text-brand-500 hover:text-brand-600 dark:text-brand-400",
      )}
    >
      {children}
    </button>
  );
}

export { TableRow as Row };
