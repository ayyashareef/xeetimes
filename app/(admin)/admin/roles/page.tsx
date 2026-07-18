'use client';

import { Fragment, useEffect, useState } from 'react';
import { Shield, Save, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';

type Permission =
  | 'article:create' | 'article:edit_own' | 'article:edit_any' | 'article:delete'
  | 'article:publish' | 'article:schedule' | 'article:view_all'
  | 'category:manage' | 'tag:manage' | 'media:manage'
  | 'user:manage' | 'settings:manage' | 'comment:moderate' | 'audit:view' | 'ad:manage';

type Role = 'SUPER_ADMIN' | 'EDITOR' | 'JOURNALIST' | 'MODERATOR';

const ALL_ROLES: Role[] = ['SUPER_ADMIN', 'EDITOR', 'JOURNALIST', 'MODERATOR'];

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  EDITOR: 'Editor',
  JOURNALIST: 'Journalist',
  MODERATOR: 'Moderator',
};

const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200',
  EDITOR: 'bg-blue-100 text-blue-700 border-blue-200',
  JOURNALIST: 'bg-green-100 text-green-700 border-green-200',
  MODERATOR: 'bg-purple-100 text-purple-700 border-purple-200',
};

const PERMISSION_LABELS: Record<Permission, string> = {
  'article:create': 'Create Articles',
  'article:edit_own': 'Edit Own Articles',
  'article:edit_any': 'Edit Any Article',
  'article:delete': 'Delete Articles',
  'article:publish': 'Publish Articles',
  'article:schedule': 'Schedule Articles',
  'article:view_all': 'View All Articles',
  'category:manage': 'Manage Categories',
  'tag:manage': 'Manage Tags',
  'media:manage': 'Manage Media',
  'user:manage': 'Manage Users',
  'settings:manage': 'Manage Settings',
  'comment:moderate': 'Moderate Comments',
  'audit:view': 'View Audit Log',
  'ad:manage': 'Manage Advertisements',
};

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Articles',
    permissions: [
      'article:create',
      'article:edit_own',
      'article:edit_any',
      'article:delete',
      'article:publish',
      'article:schedule',
      'article:view_all',
    ],
  },
  {
    label: 'Content Management',
    permissions: [
      'category:manage',
      'tag:manage',
      'media:manage',
      'comment:moderate',
      'ad:manage',
    ],
  },
  {
    label: 'Administration',
    permissions: [
      'user:manage',
      'settings:manage',
      'audit:view',
    ],
  },
];

export default function RolesPage() {
  const [permissions, setPermissions] = useState<Record<Role, Permission[]>>({
    SUPER_ADMIN: [],
    EDITOR: [],
    JOURNALIST: [],
    MODERATOR: [],
  });
  const [originalPermissions, setOriginalPermissions] = useState<Record<Role, Permission[]>>({
    SUPER_ADMIN: [],
    EDITOR: [],
    JOURNALIST: [],
    MODERATOR: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/admin/roles');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPermissions(data);
      setOriginalPermissions(data);
      setHasChanges(false);
    } catch {
      toast.error('Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    const changed = JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
    setHasChanges(changed);
  }, [permissions, originalPermissions]);

  const togglePermission = (role: Role, permission: Permission) => {
    if (role === 'SUPER_ADMIN') return; // SUPER_ADMIN always has all

    setPermissions((prev) => {
      const current = prev[role] || [];
      const has = current.includes(permission);
      return {
        ...prev,
        [role]: has
          ? current.filter((p) => p !== permission)
          : [...current, permission],
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissions),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      setPermissions(data);
      setOriginalPermissions(data);
      setHasChanges(false);
      toast.success('Role permissions saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save role permissions');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPermissions({ ...originalPermissions });
    setHasChanges(false);
  };

  const isChecked = (role: Role, permission: Permission): boolean => {
    if (role === 'SUPER_ADMIN') return true;
    return permissions[role]?.includes(permission) ?? false;
  };

  const getRolePermissionCount = (role: Role): number => {
    if (role === 'SUPER_ADMIN') {
      return PERMISSION_GROUPS.reduce((acc, g) => acc + g.permissions.length, 0);
    }
    return permissions[role]?.length ?? 0;
  };

  const totalPermissions = PERMISSION_GROUPS.reduce((acc, g) => acc + g.permissions.length, 0);

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-7 h-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-center py-12 text-gray-500">
            Loading permissions...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage which permissions each role has across the system
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Role summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {ALL_ROLES.map((role) => (
          <div
            key={role}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role]}`}
              >
                <Shield className="w-3 h-3" />
                {ROLE_LABELS[role]}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {getRolePermissionCount(role)}
              <span className="text-sm font-normal text-gray-400">
                /{totalPermissions}
              </span>
            </p>
            <p className="text-xs text-gray-500 mt-1">permissions assigned</p>
          </div>
        ))}
      </div>

      {/* Permissions matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-start text-xs font-medium text-gray-500 uppercase px-6 py-4 min-w-[240px]">
                  Permission
                </th>
                {ALL_ROLES.map((role) => (
                  <th
                    key={role}
                    className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-4 min-w-[120px]"
                  >
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLORS[role]}`}
                    >
                      {ROLE_LABELS[role]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map((group) => (
                <Fragment key={group.label}>
                  {/* Group header */}
                  <tr className="bg-gray-50">
                    <td
                      colSpan={ALL_ROLES.length + 1}
                      className="px-6 py-2.5 text-xs font-semibold text-gray-700 uppercase tracking-wider"
                    >
                      {group.label}
                    </td>
                  </tr>
                  {/* Permission rows */}
                  {group.permissions.map((permission) => (
                    <tr
                      key={permission}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-3">
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {PERMISSION_LABELS[permission]}
                          </span>
                          <span className="block text-xs text-gray-400 font-mono mt-0.5">
                            {permission}
                          </span>
                        </div>
                      </td>
                      {ALL_ROLES.map((role) => {
                        const checked = isChecked(role, permission);
                        const disabled = role === 'SUPER_ADMIN';

                        return (
                          <td key={role} className="px-4 py-3 text-center">
                            <label className="inline-flex items-center justify-center cursor-pointer">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={disabled}
                                  onChange={() => togglePermission(role, permission)}
                                  className="sr-only peer"
                                />
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                    checked
                                      ? disabled
                                        ? 'bg-gray-300 border-gray-300'
                                        : 'bg-primary border-primary'
                                      : 'bg-white border-gray-300 hover:border-gray-400'
                                  } ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                  aria-hidden="true"
                                >
                                  {checked && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                              </div>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sticky save bar when changes exist */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-gray-200 px-6 py-3 shadow-lg z-30">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <p className="text-sm text-gray-600">
              You have unsaved changes to role permissions.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Discard
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
