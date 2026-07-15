'use client';

import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
  user: { name: string; email: string };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/audit')
      .then(r => r.json())
      .then(data => { setLogs(data.logs || []); setLoading(false); });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            No audit logs yet
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{log.user?.name || log.user?.email || 'Unknown'}</span>{' '}
                    <span className="text-gray-500">{log.action}</span>{' '}
                    <span className="font-medium">{log.entity}</span>
                    {log.entityId ? <span className="text-gray-400"> ({log.entityId})</span> : null}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
