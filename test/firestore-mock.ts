/**
 * 測試用的記憶體版 Firestore，只實作排行榜 API 用到的部分。
 * 用法：vi.mock('@/lib/firebase-admin', () => import('@/test/firestore-mock'))
 */
type Data = Record<string, unknown>;

export const store = new Map<string, Map<string, Data>>();

function docsOf(name: string) {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
}

type DocRef = {
  id: string;
  get: () => Promise<{ exists: boolean; data: () => Data | undefined }>;
  set: (data: Data) => Promise<void>;
  update: (data: Data) => Promise<void>;
  delete: () => Promise<void>;
};

function docRef(name: string, id: string): DocRef {
  const docs = docsOf(name);
  return {
    id,
    get: async () => ({ exists: docs.has(id), data: () => docs.get(id) }),
    set: async data => void docs.set(id, { ...data }),
    update: async data => void docs.set(id, { ...docs.get(id), ...data }),
    delete: async () => void docs.delete(id),
  };
}

function snapshot(name: string, entries: [string, Data][]) {
  return {
    empty: entries.length === 0,
    docs: entries.map(([id, d]) => ({
      id,
      data: () => d,
      ref: docRef(name, id),
    })),
  };
}

function collection(name: string) {
  return {
    doc: (id: string) => docRef(name, id),
    get: async () => snapshot(name, [...docsOf(name).entries()]),
    orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => ({
      limit: (n: number) => ({
        get: async () => {
          const sorted = [...docsOf(name).entries()].sort(([, a], [, b]) => {
            const diff = Number(a[field]) - Number(b[field]);
            return dir === 'asc' ? diff : -diff;
          });
          return snapshot(name, sorted.slice(0, n));
        },
      }),
    }),
    where: (field: string, _op: string, value: unknown) => ({
      limit: (n: number) => ({
        get: async () =>
          snapshot(
            name,
            [...docsOf(name).entries()]
              .filter(([, d]) => d[field] === value)
              .slice(0, n),
          ),
      }),
    }),
  };
}

// 測試是單執行緒，transaction 直接依序執行即可
async function runTransaction<T>(
  fn: (tx: {
    get: (ref: DocRef) => ReturnType<DocRef['get']>;
    set: (ref: DocRef, data: Data) => void;
    update: (ref: DocRef, data: Data) => void;
  }) => Promise<T>,
): Promise<T> {
  const writes: (() => Promise<void>)[] = [];
  const result = await fn({
    get: ref => ref.get(),
    set: (ref, data) => void writes.push(() => ref.set(data)),
    update: (ref, data) => void writes.push(() => ref.update(data)),
  });
  for (const write of writes) await write();
  return result;
}

export const db = { collection, runTransaction };
