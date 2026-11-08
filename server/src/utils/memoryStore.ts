import { initialCampaigns, initialContacts, initialTemplates, initialSchedules, initialWorkflow } from "./seedData.js";

const uid = () => Math.random().toString(36).slice(2, 10);

class MemoryCollection<T extends { _id: string }> {
  private items: Map<string, T> = new Map();

  constructor(initial: any[] = []) {
    initial.forEach((item) => {
      const id = item._id || uid();
      this.items.set(id, { ...item, _id: id, createdAt: new Date(), updatedAt: new Date() });
    });
  }

  async find(filter: any = {}): Promise<T[]> {
    let result = Array.from(this.items.values());
    if (filter.status) result = result.filter((i: any) => i.status === filter.status);
    if (filter.tags) result = result.filter((i: any) => i.tags?.includes(filter.tags));
    return result;
  }

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async findOne(filter: any): Promise<T | null> {
    const all = await this.find(filter);
    return all[0] || null;
  }

  async create(data: any): Promise<T> {
    const id = uid();
    const doc = { ...data, _id: id, createdAt: new Date(), updatedAt: new Date() };
    this.items.set(id, doc);
    return doc;
  }

  async insertMany(dataList: any[]): Promise<T[]> {
    return Promise.all(dataList.map((d) => this.create(d)));
  }

  async findByIdAndUpdate(id: string, patch: any, options: any = { new: true }): Promise<T | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.items.set(id, updated);
    return updated;
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    const existing = this.items.get(id);
    if (!existing) return null;
    this.items.delete(id);
    return existing;
  }

  async countDocuments(filter: any = {}): Promise<number> {
    const items = await this.find(filter);
    return items.length;
  }
}

export const memoryDb = {
  contacts: new MemoryCollection<any>([]),
  templates: new MemoryCollection<any>([]),
  campaigns: new MemoryCollection<any>([]),
  schedules: new MemoryCollection<any>([]),
  workflows: new MemoryCollection<any>([]),
  emailLogs: new MemoryCollection<any>([]),
  aiEmails: new MemoryCollection<any>([]),
  settings: new MemoryCollection<any>([
    {
      provider: "ethereal",
      fromEmail: "notifications@sendflow.app",
      fromName: "SendFlow Studio",
      apiBaseUrl: "http://localhost:4000",
      appUrl: "http://localhost:5173",
      smtp: { host: "", port: 587, user: "", pass: "", secure: false },
      brevoApiKey: "",
    },
  ]),
};

