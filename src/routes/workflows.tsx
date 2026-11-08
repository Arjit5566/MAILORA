import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState, useEffect, type DragEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  Handle,
  Position,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Zap, Mail, Clock, GitBranch, Tag, Trash2, Save, Play, Sparkles, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { GlassCard, PageHeader } from "@/components/kit";
import { meta } from "@/lib/meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/workflows")({
  head: () => meta("Automations", "Drag-and-drop workflow builder for email automations."),
  component: () => (
    <ReactFlowProvider>
      <Builder />
    </ReactFlowProvider>
  ),
});

const kinds = {
  trigger: { label: "Trigger", icon: Zap, hint: "Contact signs up" },
  email: { label: "Send email", icon: Mail, hint: "Welcome email" },
  delay: { label: "Wait", icon: Clock, hint: "Wait 3 days" },
  condition: { label: "Condition", icon: GitBranch, hint: "Opened email?" },
  tag: { label: "Add tag", icon: Tag, hint: "engaged" },
} as const;

type Kind = keyof typeof kinds;
type FlowData = { kind: Kind; text: string; templateId?: string };

function FlowNode({ data, selected }: NodeProps<Node<FlowData>>) {
  const k = kinds[data.kind] || kinds.trigger;
  const Icon = k.icon;
  return (
    <div
      className={`glass min-w-48 rounded-xl px-3.5 py-3 shadow-lg transition-all ${
        selected ? "shadow-glow ring-2 ring-primary bg-accent/30" : "hover:border-primary/50"
      }`}
    >
      {data.kind !== "trigger" && (
        <Handle type="target" position={Position.Top} className="!bg-primary !h-2.5 !w-2.5" />
      )}
      <div className="flex items-center gap-2.5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand shadow-glow">
          <Icon className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-foreground tracking-wide uppercase">{k.label}</div>
          <div className="text-[11px] text-muted-foreground truncate font-medium">{data.text}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-primary-glow !h-2.5 !w-2.5" />
    </div>
  );
}

const nodeTypes = { flow: FlowNode };

const initialNodes: Node<FlowData>[] = [
  { id: "1", type: "flow", position: { x: 200, y: 20 }, data: { kind: "trigger", text: "Contact signs up" } },
  { id: "2", type: "flow", position: { x: 200, y: 130 }, data: { kind: "email", text: "Welcome email" } },
  { id: "3", type: "flow", position: { x: 200, y: 240 }, data: { kind: "delay", text: "Wait 3 days" } },
  { id: "4", type: "flow", position: { x: 200, y: 350 }, data: { kind: "condition", text: "Opened welcome?" } },
  { id: "5", type: "flow", position: { x: 40, y: 470 }, data: { kind: "email", text: "Day 3 tips" } },
  { id: "6", type: "flow", position: { x: 360, y: 470 }, data: { kind: "tag", text: "needs-nudge" } },
];

const edge = (s: string, t: string): Edge => ({
  id: `${s}-${t}`,
  source: s,
  target: t,
  animated: true,
  style: { stroke: "var(--primary)", strokeWidth: 2 },
});

const initialEdges = [
  edge("1", "2"),
  edge("2", "3"),
  edge("3", "4"),
  edge("4", "5"),
  edge("4", "6"),
];

function Builder() {
  const { user } = useAuth();
  const { workflows, templates, contacts } = useStore();
  const currentWorkflow = workflows.current;

  const [nodes, setNodes, onNodesChange] = useNodesState(
    currentWorkflow?.nodes?.length ? currentWorkflow.nodes : initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    currentWorkflow?.edges?.length ? currentWorkflow.edges : initialEdges
  );
  const [active, setActive] = useState(currentWorkflow?.isActive ?? true);
  const [testingWorkflow, setTestingWorkflow] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const idRef = useRef(10);
  const selected = nodes.find((n) => n.selected);

  // Sync if current workflow loads from backend
  useEffect(() => {
    if (currentWorkflow?.nodes?.length) {
      setNodes(currentWorkflow.nodes);
    }
    if (currentWorkflow?.edges?.length) {
      setEdges(currentWorkflow.edges);
    }
    if (currentWorkflow?.isActive !== undefined) {
      setActive(currentWorkflow.isActive);
    }
  }, [currentWorkflow]);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((e) =>
        addEdge({ ...c, animated: true, style: { stroke: "var(--primary)", strokeWidth: 2 } }, e)
      ),
    [setEdges]
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/flow") as Kind;
    if (!kind) return;
    const id = String(idRef.current++);
    setNodes((n) => [
      ...n,
      {
        id,
        type: "flow",
        position: screenToFlowPosition({ x: e.clientX, y: e.clientY }),
        data: { kind, text: kinds[kind].hint },
      },
    ]);
  };

  const updateText = (text: string) =>
    setNodes((ns) =>
      ns.map((n) => (n.selected ? { ...n, data: { ...n.data, text } } : n))
    );

  const removeSelected = () => {
    const ids = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setNodes((n) => n.filter((x) => !ids.has(x.id)));
    setEdges((e) => e.filter((x) => !ids.has(x.source) && !ids.has(x.target)));
  };

  const handleSave = async () => {
    await workflows.save({
      nodes,
      edges,
      isActive: active,
    });
    toast.success(`Workflow saved to database · ${nodes.length} steps, ${edges.length} connections`);
  };

  const handleToggleActive = async () => {
    const next = !active;
    setActive(next);
    if (currentWorkflow?._id) {
      await workflows.toggleActive(currentWorkflow._id);
    }
    toast(next ? "Workflow activated" : "Workflow paused");
  };

  const handleTestRun = async () => {
    setTestingWorkflow(true);
    try {
      // Ensure workflow is saved if new
      let wfId = currentWorkflow?._id;
      if (!wfId) {
        await workflows.save({
          name: "Customer Onboarding Journey",
          nodes,
          edges,
          isActive: active,
        });
        wfId = currentWorkflow?._id || "1";
      }

      const sampleContact = contacts.items[0];
      const targetPayload = sampleContact
        ? { contactId: sampleContact._id }
        : { email: user?.email || "arjitripathi0607@gmail.com", name: user?.name || "Arjit Tripathi" };

      const res = await workflows.testTrigger(wfId || "1", targetPayload);
      toast.success(res?.message || "Executed test run for sample recipient!");
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger test execution");
    } finally {
      setTestingWorkflow(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Automation Workflow Builder"
        description="Design multi-step email journeys with real-time triggers, delays, and condition branching."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={testingWorkflow}
              onClick={handleTestRun}
              className="text-xs"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
              {testingWorkflow ? "Running…" : "Simulate Run"}
            </Button>
            <Button variant="outline" onClick={handleToggleActive} className="text-xs">
              <Play className={`h-3.5 w-3.5 mr-1 ${active ? "text-success" : ""}`} />
              {active ? "Active" : "Paused"}
            </Button>
            <Button onClick={handleSave} className="bg-gradient-brand shadow-glow text-xs">
              <Save className="h-3.5 w-3.5 mr-1" /> Save Workflow
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <GlassCard className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Workflow Steps
            </h3>
            <span className="text-[10px] text-muted-foreground">Drag to canvas</span>
          </div>

          <div className="space-y-2">
            {(Object.keys(kinds) as Kind[]).map((k) => {
              const K = kinds[k];
              return (
                <div
                  key={k}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/flow", k);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex cursor-grab items-center gap-2.5 rounded-xl border bg-card/60 p-2.5 text-xs font-medium transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-glow active:cursor-grabbing"
                >
                  <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-primary">
                    <K.icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">{K.label}</div>
                    <div className="text-[10px] text-muted-foreground">{K.hint}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-3 border-t pt-4"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  Step Config
                </h4>
                <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] uppercase font-mono">
                  {selected.data.kind}
                </span>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Step Label / Action</Label>
                <Input
                  value={selected.data.text}
                  onChange={(e) => updateText(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              {selected.data.kind === "email" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Attach Template</Label>
                  <Select
                    onValueChange={(val) => {
                      const t = templates.items.find((x) => x._id === val);
                      if (t) updateText(t.name);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select template…" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.items.map((t) => (
                        <SelectItem key={t._id} value={t._id} className="text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selected.data.kind === "delay" && (
                <div className="grid gap-1.5">
                  <Label className="text-xs">Quick Duration</Label>
                  <Select onValueChange={(val) => updateText(val)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Preset delay…" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Wait 15 minutes", "Wait 1 hour", "Wait 1 day", "Wait 3 days", "Wait 7 days"].map(
                        (d) => (
                          <SelectItem key={d} value={d} className="text-xs">
                            {d}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs h-8"
                onClick={removeSelected}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete step
              </Button>
            </motion.div>
          )}

          <div className="rounded-xl border bg-muted/30 p-2.5 text-[11px] text-muted-foreground mt-4">
            <div className="font-semibold text-foreground flex items-center gap-1 mb-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Engine Status
            </div>
            Connected to automated BullMQ worker. Delayed jobs run automatically in background.
          </div>
        </GlassCard>

        <div
          className="glass h-[660px] overflow-hidden rounded-2xl border relative shadow-xl"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            colorMode="dark"
          >
            <Background gap={20} color="var(--border)" />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
