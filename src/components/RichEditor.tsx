import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Heading2, Link2, AlignCenter, Quote } from "lucide-react";

const tools = [
  { icon: Bold, cmd: "bold" }, { icon: Italic, cmd: "italic" }, { icon: Underline, cmd: "underline" },
  { icon: Heading2, cmd: "formatBlock", arg: "h2" }, { icon: Quote, cmd: "formatBlock", arg: "blockquote" },
  { icon: List, cmd: "insertUnorderedList" }, { icon: ListOrdered, cmd: "insertOrderedList" },
  { icon: AlignCenter, cmd: "justifyCenter" }, { icon: Link2, cmd: "createLink" },
];

export function RichEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value; }, [value]);
  const run = (cmd: string, arg?: string) => {
    ref.current?.focus();
    if (cmd === "createLink") { const url = prompt("Link URL"); if (!url) return; arg = url; }
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };
  return (
    <div className="overflow-hidden rounded-xl border bg-background/50">
      <div className="flex flex-wrap gap-1 border-b bg-muted/40 p-1.5">
        {tools.map((t) => (
          <button key={t.cmd + (t.arg ?? "")} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => run(t.cmd, t.arg)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent" aria-label={t.cmd}>
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <span className="ml-auto self-center pr-2 text-xs text-muted-foreground">Use {"{{name}}"} for merge tags</span>
      </div>
      <div ref={ref} contentEditable suppressContentEditableWarning onInput={(e) => onChange(e.currentTarget.innerHTML)}
        className="prose-email min-h-56 p-4 text-sm outline-none [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline" />
    </div>
  );
}
