import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  uid,
  request,
  endpoints,
  API_URL,
  type Campaign,
  type Contact,
  type Template,
  type ScheduledEmail,
  type WorkflowItem,
} from "./api";

function useStoreValue() {
  const [campaignsList, setCampaigns] = useState<Campaign[]>([]);
  const [contactsList, setContacts] = useState<Contact[]>([]);
  const [templatesList, setTemplates] = useState<Template[]>([]);
  const [schedulesList, setSchedules] = useState<ScheduledEmail[]>([]);
  const [workflowsList, setWorkflows] = useState<WorkflowItem[]>([]);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync with backend API
  const loadFromBackend = useCallback(async () => {
    try {
      const [cRes, ctRes, tRes, sRes, wRes] = await Promise.allSettled([
        request<Campaign[]>(endpoints.campaigns),
        request<Contact[]>(endpoints.contacts),
        request<Template[]>(endpoints.templates),
        request<ScheduledEmail[]>(endpoints.schedules),
        request<WorkflowItem[]>(endpoints.workflows),
      ]);

      let connected = false;

      if (cRes.status === "fulfilled" && Array.isArray(cRes.value)) {
        setCampaigns(cRes.value);
        connected = true;
      }
      if (ctRes.status === "fulfilled" && Array.isArray(ctRes.value)) {
        setContacts(ctRes.value);
        connected = true;
      }
      if (tRes.status === "fulfilled" && Array.isArray(tRes.value)) {
        setTemplates(tRes.value);
        connected = true;
      }
      if (sRes.status === "fulfilled" && Array.isArray(sRes.value)) {
        setSchedules(sRes.value);
        connected = true;
      }
      if (wRes.status === "fulfilled" && Array.isArray(wRes.value)) {
        setWorkflows(wRes.value);
        connected = true;
      }

      setBackendConnected(connected);
    } catch {
      setBackendConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromBackend();
  }, [loadFromBackend]);

  // Campaign methods
  const campaignActions = {
    items: campaignsList,
    add: async (item: Omit<Campaign, "_id">) => {
      const tempId = uid();
      const localItem: Campaign = { ...item, _id: tempId };
      setCampaigns((s) => [localItem, ...s]);

      try {
        const created = await request<Campaign>(endpoints.campaigns, {
          method: "POST",
          body: JSON.stringify(item),
        });
        setCampaigns((s) => s.map((x) => (x._id === tempId ? created : x)));
        return created;
      } catch {
        return localItem;
      }
    },
    update: async (id: string, patch: Partial<Campaign>) => {
      setCampaigns((s) => s.map((x) => (x._id === id ? { ...x, ...patch } : x)));
      try {
        await request(`${endpoints.campaigns}/${id}`, {
          method: "PUT",
          body: JSON.stringify(patch),
        });
      } catch {
        // Handled
      }
    },
    remove: async (ids: string | string[]) => {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      setCampaigns((s) => s.filter((x) => !set.has(x._id)));
      for (const id of set) {
        try {
          await request(`${endpoints.campaigns}/${id}`, { method: "DELETE" });
        } catch {
          // Handled
        }
      }
    },
    send: async (id: string, payload?: { recipientIds?: string[]; manualEmails?: string[]; recipients?: any[] }) => {
      setCampaigns((s) => s.map((x) => (x._id === id ? { ...x, status: "sending" } : x)));
      return request(`${endpoints.campaigns}/${id}/send`, {
        method: "POST",
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      });
    },
    testSend: async (id: string, testEmail: string, recipientName?: string) => {
      return request<{ success?: boolean; message: string; previewUrl?: string }>(`${endpoints.campaigns}/${id}/test`, {
        method: "POST",
        body: JSON.stringify({ toEmail: testEmail, recipientName }),
      });
    },
    pause: async (id: string) => {
      setCampaigns((s) => s.map((x) => (x._id === id ? { ...x, status: "paused" } : x)));
      return request(`${endpoints.campaigns}/${id}/pause`, { method: "POST" });
    },
    resume: async (id: string) => {
      setCampaigns((s) => s.map((x) => (x._id === id ? { ...x, status: "draft" } : x)));
      return request(`${endpoints.campaigns}/${id}/resume`, { method: "POST" });
    },
    duplicate: async (id: string): Promise<Campaign | undefined> => {
      try {
        const created = await request<Campaign>(`${endpoints.campaigns}/${id}/duplicate`, { method: "POST" });
        setCampaigns((s) => [created, ...s]);
        return created;
      } catch (err) {
        // Fallback local duplicate
        const item = campaignsList.find((c) => c._id === id);
        if (item) {
          return campaignActions.add({
            ...item,
            name: `${item.name} (Copy)`,
            status: "draft",
            sent: 0,
            opens: 0,
            clicks: 0,
            date: new Date().toISOString().slice(0, 10),
          });
        }
        return undefined;
      }
    },
    getStats: async (id: string) => {
      return request<{
        campaign: Campaign;
        metrics: { sent: number; opens: number; clicks: number; openRate: string; clickRate: string };
        recentLogs: any[];
      }>(`${endpoints.campaigns}/${id}/stats`);
    },
  };

  // Contact methods
  const contactActions = {
    items: contactsList,
    add: async (item: Omit<Contact, "_id">) => {
      const tempId = uid();
      const localItem: Contact = { ...item, _id: tempId };
      setContacts((s) => [localItem, ...s]);

      try {
        const created = await request<Contact>(endpoints.contacts, {
          method: "POST",
          body: JSON.stringify(item),
        });
        setContacts((s) => s.map((x) => (x._id === tempId ? created : x)));
        return created;
      } catch {
        return localItem;
      }
    },
    update: async (id: string, patch: Partial<Contact>) => {
      setContacts((s) => s.map((x) => (x._id === id ? { ...x, ...patch } : x)));
      try {
        await request(`${endpoints.contacts}/${id}`, {
          method: "PUT",
          body: JSON.stringify(patch),
        });
      } catch {
        // Handled
      }
    },
    remove: async (ids: string | string[]) => {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      setContacts((s) => s.filter((x) => !set.has(x._id)));
      try {
        await request(`${endpoints.contacts}/delete-many`, {
          method: "POST",
          body: JSON.stringify({ ids: Array.from(set) }),
        });
      } catch {
        // Handled
      }
    },
    bulkImport: async (contactsData: Array<Partial<Contact>>) => {
      const res = await request<{ message: string; added: number; skipped: number }>(
        `${endpoints.contacts}/bulk-import`,
        {
          method: "POST",
          body: JSON.stringify({ contacts: contactsData }),
        }
      );
      await loadFromBackend();
      return res;
    },
    importCsv: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("auth_token") || localStorage.getItem("token");
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_URL || "http://localhost:4000/api"}/contacts/import-csv`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "CSV upload failed");
      }
      const data = await res.json();
      await loadFromBackend();
      return data;
    },
  };

  // Template methods
  const templateActions = {
    items: templatesList,
    add: async (item: Omit<Template, "_id">) => {
      const tempId = uid();
      const localItem: Template = { ...item, _id: tempId };
      setTemplates((s) => [localItem, ...s]);

      try {
        const created = await request<Template>(endpoints.templates, {
          method: "POST",
          body: JSON.stringify(item),
        });
        setTemplates((s) => s.map((x) => (x._id === tempId ? created : x)));
        return created;
      } catch {
        return localItem;
      }
    },
    update: async (id: string, patch: Partial<Template>) => {
      setTemplates((s) => s.map((x) => (x._id === id ? { ...x, ...patch } : x)));
      try {
        await request(`${endpoints.templates}/${id}`, {
          method: "PUT",
          body: JSON.stringify(patch),
        });
      } catch {
        // Handled
      }
    },
    remove: async (ids: string | string[]) => {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      setTemplates((s) => s.filter((x) => !set.has(x._id)));
      for (const id of set) {
        try {
          await request(`${endpoints.templates}/${id}`, { method: "DELETE" });
        } catch {
          // Handled
        }
      }
    },
    testSend: async (id: string, testEmail: string) => {
      return request<{ message: string; previewUrl?: string }>(`${endpoints.templates}/${id}/test-send`, {
        method: "POST",
        body: JSON.stringify({ testEmail }),
      });
    },
  };

  // Schedule methods
  const scheduleActions = {
    items: schedulesList,
    add: async (item: Omit<ScheduledEmail, "_id">) => {
      const tempId = uid();
      const localItem: ScheduledEmail = { ...item, _id: tempId, status: "scheduled" };
      setSchedules((s) => [localItem, ...s]);

      try {
        const created = await request<ScheduledEmail>(endpoints.schedules, {
          method: "POST",
          body: JSON.stringify(item),
        });
        setSchedules((s) => s.map((x) => (x._id === tempId ? created : x)));
        return created;
      } catch {
        return localItem;
      }
    },
    update: async (id: string, patch: Partial<ScheduledEmail>) => {
      setSchedules((s) => s.map((x) => (x._id === id ? { ...x, ...patch } : x)));
      try {
        await request(`${endpoints.schedules}/${id}`, {
          method: "PUT",
          body: JSON.stringify(patch),
        });
      } catch {
        // Handled
      }
    },
    pause: async (id: string) => {
      setSchedules((s) => s.map((x) => (x._id === id ? { ...x, status: "paused" } : x)));
      return request(`${endpoints.schedules}/${id}/pause`, { method: "POST" });
    },
    resume: async (id: string) => {
      setSchedules((s) => s.map((x) => (x._id === id ? { ...x, status: "scheduled" } : x)));
      return request(`${endpoints.schedules}/${id}/resume`, { method: "POST" });
    },
    cancel: async (id: string) => {
      setSchedules((s) => s.map((x) => (x._id === id ? { ...x, status: "cancelled" } : x)));
      return request(`${endpoints.schedules}/${id}/cancel`, { method: "POST" });
    },
    remove: async (ids: string | string[]) => {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      setSchedules((s) => s.filter((x) => !set.has(x._id)));
      for (const id of set) {
        try {
          await request(`${endpoints.schedules}/${id}`, { method: "DELETE" });
        } catch {
          // Handled
        }
      }
    },
    runNow: async (id: string) => {
      return request(`${endpoints.schedules}/${id}/run-now`, { method: "POST" });
    },
  };

  // Workflow actions
  const workflowActions = {
    items: workflowsList,
    current: workflowsList[0] || null,
    save: async (data: Partial<WorkflowItem>) => {
      const active = workflowsList[0];
      const updated: WorkflowItem = {
        ...(active || {
          _id: uid(),
          name: "Automation Workflow",
          description: "",
          isActive: true,
          nodes: [],
          edges: [],
        }),
        ...data,
      };
      setWorkflows([updated]);

      if (updated._id) {
        try {
          await request(`${endpoints.workflows}/${updated._id}`, {
            method: "PUT",
            body: JSON.stringify(data),
          });
        } catch {
          // Handled
        }
      }
    },
    toggleActive: async (id: string) => {
      setWorkflows((s) => s.map((w) => (w._id === id ? { ...w, isActive: !w.isActive } : w)));
      return request<{ message: string; isActive: boolean }>(`${endpoints.workflows}/${id}/toggle`, {
        method: "POST",
      });
    },
    testTrigger: async (id: string, contactId?: string) => {
      return request<{ message: string; contactId: string }>(`${endpoints.workflows}/${id}/trigger`, {
        method: "POST",
        body: JSON.stringify({ contactId }),
      });
    },
  };

  // Bulk send action
  const bulkSend = async (recipientIds: string[], subject: string, html: string) => {
    return request<{ message: string; campaignId: string; totalRecipients: number }>(endpoints.bulk, {
      method: "POST",
      body: JSON.stringify({ recipientIds, subject, html }),
    });
  };

  return {
    campaigns: campaignActions,
    contacts: contactActions,
    templates: templateActions,
    schedules: scheduleActions,
    workflows: workflowActions,
    bulkSend,
    backendConnected,
    loading,
    refresh: loadFromBackend,
  };
}

export type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useStoreValue();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
