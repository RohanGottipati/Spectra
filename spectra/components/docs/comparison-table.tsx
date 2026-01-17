import { ReactNode, Children, isValidElement, cloneElement, ReactElement, HTMLAttributes } from "react";

interface ComparisonTableProps {
  children: ReactNode;
}

type HTMLElementProps = HTMLAttributes<HTMLElement> & { children?: ReactNode };

export function ComparisonTable({ children }: ComparisonTableProps) {
  // Process children to add styling classes
  const processedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const typedChild = child as ReactElement<HTMLElementProps>;

    // Handle thead
    if (typedChild.type === "thead") {
      const theadChildren = Children.map(typedChild.props.children, (tr) => {
        if (!isValidElement(tr) || tr.type !== "tr") return tr;
        const typedTr = tr as ReactElement<HTMLElementProps>;

        const trChildren = Children.map(typedTr.props.children, (th) => {
          if (!isValidElement(th)) return th;
          const typedTh = th as ReactElement<HTMLElementProps>;
          return cloneElement(typedTh, {
            className: "px-4 py-3 text-left font-semibold bg-muted/50",
          });
        });

        return cloneElement(
          typedTr,
          {
            className: "border-b border-border",
          },
          trChildren,
        );
      });

      return cloneElement(typedChild, {}, theadChildren);
    }

    // Handle tbody
    if (typedChild.type === "tbody") {
      const tbodyChildren = Children.map(typedChild.props.children, (tr) => {
        if (!isValidElement(tr) || tr.type !== "tr") return tr;
        const typedTr = tr as ReactElement<HTMLElementProps>;

        const trChildren = Children.map(typedTr.props.children, (td) => {
          if (!isValidElement(td)) return td;
          const typedTd = td as ReactElement<HTMLElementProps>;
          return cloneElement(typedTd, {
            className: "px-4 py-3 text-sm",
          });
        });

        return cloneElement(
          typedTr,
          {
            className:
              "border-b border-border hover:bg-muted/50 transition-colors",
          },
          trChildren,
        );
      });

      return cloneElement(typedChild, {}, tbodyChildren);
    }

    return child;
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-border my-6">
      <table className="w-full">{processedChildren}</table>
    </div>
  );
}
