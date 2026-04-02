import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Search } from "lucide-react"

import { cn } from "../../components/lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import { Textarea } from "./textarea"
import { Divider } from "./divider"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group border-input dark:bg-input/30 shadow-xs relative flex w-full items-center rounded-md border outline-none transition-[color,box-shadow]",
        "h-9 has-[>textarea]:h-auto",

        // Variants based on alignment.
        "has-[>[data-align=inline-start]]:[&>input]:pl-2",
        "has-[>[data-align=inline-end]]:[&>input]:pr-2",
        "has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",

        // Focus state.
        "has-[[data-slot=input-group-control]:focus-visible]:ring-ring has-[[data-slot=input-group-control]:focus-visible]:ring-1",

        // Error state.
        "has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[[data-slot][aria-invalid=true]]:border-destructive dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",

        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "text-muted-foreground flex h-auto cursor-text select-none items-center justify-center gap-2 py-1.5 text-sm font-medium group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
        "inline-end":
          "order-last pr-3 has-[>button]:mr-[-0.4rem] has-[>kbd]:mr-[-0.35rem]",
        "block-start":
          "[.border-b]:pb-3 order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5",
        "block-end":
          "[.border-t]:pt-3 order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn(inputGroupAddonVariants({ align }), className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement
          ?.querySelector<HTMLElement>("[data-slot=input-group-control]")
          ?.focus()
      }}
      {...props}
    />
  )
}

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
        "icon-xs":
          "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  }
)

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof inputGroupButtonVariants>) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "text-muted-foreground flex items-center gap-2 text-sm [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
        className
      )}
      {...props}
    />
  )
}

function InputGroupWithAddon({
  className,
  value,
  onValueChange,
  placeholder = "Input your remarks here",
}: {
  className?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
}) {
  const [isBold, setIsBold] = React.useState(false);
  const [isItalic, setIsItalic] = React.useState(false);
  const [isUnderline, setIsUnderline] = React.useState(false);
  const [isBulletList, setIsBulletList] = React.useState(false);
  const [isNumberList, setIsNumberList] = React.useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!editorRef.current) return;
    const next = value ?? "";
    if (editorRef.current.textContent === next) return;
    editorRef.current.textContent = next;
  }, [value]);

  const syncToolbarState = React.useCallback(() => {
    setIsBold(Boolean(document.queryCommandState?.("bold")));
    setIsItalic(Boolean(document.queryCommandState?.("italic")));
    setIsUnderline(Boolean(document.queryCommandState?.("underline")));
    setIsBulletList(Boolean(document.queryCommandState?.("insertUnorderedList")));
    setIsNumberList(Boolean(document.queryCommandState?.("insertOrderedList")));
  }, []);

  React.useEffect(() => {
    const onSelectionChange = () => {
      if (!editorRef.current) return;
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchorNode = sel.anchorNode;
      if (!anchorNode) return;
      if (!editorRef.current.contains(anchorNode)) return;
      syncToolbarState();
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [syncToolbarState]);

  const exec = (
    command:
      | "bold"
      | "italic"
      | "underline"
      | "insertUnorderedList"
      | "insertOrderedList"
  ) => {
    editorRef.current?.focus();
    document.execCommand(command);
    syncToolbarState();
  };

  const handleBold = () => exec("bold");
  const handleItalic = () => exec("italic");
  const handleUnderline = () => exec("underline");
  const handleBulletList = () => exec("insertUnorderedList");
  const handleNumberList = () => exec("insertOrderedList");
  const handleHyperlink = () => {
    editorRef.current?.focus();

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() ?? "";

    // If cursor/selection is already inside a link and there's no selected text,
    // treat button as "remove link".
    const rawAnchor = selection?.anchorNode;
    const anchorEl =
      rawAnchor instanceof Element
        ? rawAnchor
        : (rawAnchor as { parentElement?: Element | null } | null)?.parentElement ?? null;
    const existingLink = (anchorEl?.closest("a") ?? null) as HTMLAnchorElement | null;
    if (existingLink && selectedText.length === 0) {
      document.execCommand("unlink");
      syncToolbarState();
      return;
    }

    // If the user highlighted something, assume it *is* the URL they want.
    // Normalize to a valid href.
    if (selectedText.length > 0) {
      const href =
        /^https?:\/\//i.test(selectedText) || /^mailto:/i.test(selectedText)
          ? selectedText
          : `https://${selectedText}`;

      document.execCommand("createLink", false, href);
      syncToolbarState();
      return;
    }

    // Fallback: no selection, ask for URL.
    const url = window.prompt("Enter link URL:");
    if (!url) return;
    const href =
      /^https?:\/\//i.test(url) || /^mailto:/i.test(url) ? url : `https://${url}`;
    document.execCommand("createLink", false, href);
    syncToolbarState();
  };

  return (
   <div className="border border-black rounded-md">
    <div className="flex items-center justify-end mt-3">
      <Button 
        variant="icon" 
        onClick={handleBold}
        className={isBold ? "bg-gray-200" : ""}
      > 
        <img src="BlackBoldIcon.png" alt="BlackBoldIcon" />
      </Button>
      <Button 
        variant="icon"
        onClick={handleItalic}
        className={isItalic ? "bg-gray-200" : ""}
      > 
        <img src="BlackItalicIcon.png" alt="BlackItalicIcon" />
      </Button>
      <Button 
        variant="icon"
        onClick={handleUnderline}
        className={isUnderline ? "bg-gray-200" : ""}
      > 
        <img src="BlackUnderlineIcon.png" alt="BlackUnderlineIcon" />
      </Button>
      <Button
        variant="icon"
        onClick={handleBulletList}
        className={isBulletList ? "bg-gray-200" : ""}
      > 
        <img src="BlackBulletinIcon.png" alt="BlackButtonIcon" />
      </Button>
      <Button
        variant="icon"
        onClick={handleNumberList}
        className={isNumberList ? "bg-gray-200" : ""}
      > 
        <img src="BlackNumberingIcon.png" alt="BlackNumberingIcon" />
      </Button>
      <Button variant="icon" onClick={handleHyperlink}> 
        <img src="BlackHyperlinkIcon.png" alt="BlackHyperlinkIcon" />
      </Button>
    </div>

    <Divider className="bg-black my-2 w-full h-0.5" />
    <div className="min-h-40">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "min-h-40 w-full px-3 py-2 bg-transparent outline-none",
          "focus:outline-none focus:ring-0",
          "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-1",
          "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-1",
          "[&_li]:my-0.5",
          "[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 [&_a]:cursor-pointer",
          "[&:empty:before]:content-[attr(data-placeholder)] [&:empty:before]:text-muted-foreground",
          className
        )}
        onInput={() => {
          syncToolbarState();
          onValueChange?.(editorRef.current?.textContent ?? "");
        }}
        onKeyUp={() => {
          syncToolbarState();
        }}
        onMouseUp={() => {
          syncToolbarState();
        }}
        onClick={(e) => {
          const rawTarget = e.target as unknown;
          const targetEl =
            rawTarget instanceof Element
              ? rawTarget
              : (rawTarget as { parentElement?: Element | null } | null)?.parentElement ?? null;
          const a = (targetEl?.closest("a") ?? null) as HTMLAnchorElement | null;
          if (!a) return;

          // In a contentEditable, normal click is usually for caret placement.
          // Use Ctrl/Cmd+click to follow the link.
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            window.open(a.href, "_blank", "noopener,noreferrer");
          }
        }}
      />
    </div>
   </div>
  )
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input-group-control"
      className={cn(
        "flex-1 rounded-none border-0 bg-transparent px-0 text-[hsl(var(--text-black))] shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:border-transparent focus:outline-none focus:ring-0 focus:border-0 [&:focus]:outline-none [&:focus]:ring-0 [&:focus-visible]:outline-none [&:focus-visible]:ring-0 [&:focus]:!outline-none [&:focus]:!ring-0 [&:focus-visible]:!outline-none [&:focus-visible]:!ring-0",
        className
      )}
      {...props}
    />
  )
}

function InputGroupTextarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <Textarea
      data-slot="input-group-control"
      className={cn(
        "flex-1 resize-none rounded-none border-1 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

type SearchInputGroupProps = Omit<React.ComponentProps<typeof Input>, "type"> & {
  containerClassName?: string;
};

const DEFAULT_SEARCH_PLACEHOLDER = "Search...";

function SearchInputGroup({
  className,
  containerClassName,
  placeholder = DEFAULT_SEARCH_PLACEHOLDER,
  size = "sm",
  ...props
}: SearchInputGroupProps) {
  return (
    <InputGroup
      className={cn(
        "bg-white border-primary ",
        containerClassName
      )}
    >
      <InputGroupAddon>
        <Search className="h-4 w-4" />
      </InputGroupAddon>
      <Input
        type="search"
        size={size}
        placeholder={placeholder}
        data-slot="input-group-control"
        className={cn(
          "h-full flex-1 rounded-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 p-2",
          className
        )}
        {...props}
      />
    </InputGroup>
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
  InputGroupWithAddon,
  DEFAULT_SEARCH_PLACEHOLDER,
  SearchInputGroup,
}
