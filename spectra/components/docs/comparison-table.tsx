import { ReactNode, Children, isValidElement, cloneElement } from "react";

interface ComparisonTableProps {
  children: ReactNode;
}

export function ComparisonTable({ children }: ComparisonTableProps) {
  // Process children to add styling classes
  const processedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;

    // Handle thead
    if (child.type === "thead") {
      const theadChildren = Children.map(child.props.children, (tr) => {
        if (!isValidElement(tr) || tr.type !== "tr") return tr;

        const trChildren = Children.map(tr.props.children, (th) => {
          if (!isValidElement(th)) return th;
          return cloneElement(th, {
            className: "px-4 py-3 text-left font-semibold bg-muted/50",
          });
        });

        return cloneElement(
          tr,
          {
            className: "border-b border-border",
          },
          trChildren,
        );
      });

      return cloneElement(child, {}, theadChildren);
    }

    // Handle tbody
    if (child.type === "tbody") {
      const tbodyChildren = Children.map(child.props.children, (tr) => {
        if (!isValidElement(tr) || tr.type !== "tr") return tr;

        const trChildren = Children.map(tr.props.children, (td) => {
          if (!isValidElement(td)) return td;
          return cloneElement(td, {
            className: "px-4 py-3 text-sm",
          });
        });

        return cloneElement(
          tr,
          {
            className:
              "border-b border-border hover:bg-muted/50 transition-colors",
          },
          trChildren,
        );
      });

      return cloneElement(child, {}, tbodyChildren);
    }

    return child;
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border my-6">
      <table className="w-full">{processedChildren}</table>
    </div>
  );
}
