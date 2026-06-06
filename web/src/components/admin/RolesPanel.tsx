"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  ClipboardList,
  LayoutGrid,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  Shield,
  Smartphone,
  Trash2,
  UserCog,
  Users,
  UsersRound,
} from "lucide-react";
import { useI18n } from "@/components/I18nProvider";
import { useFeedback } from "@/components/ui/FeedbackProvider";
import { IconTabBar } from "@/components/ui/icon-tabs";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TextField } from "@/components/ui/Field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import {
  CancelFormButton,
  PrimaryFormButton,
} from "@/components/ui/FormActions";
import {
  DEFAULT_SYSTEM_ROLE_PERMISSIONS,
  PERMISSION_CATALOG,
  validateRolePermissionGrants,
  type PermissionDefinition,
  type RolePermission,
  type RoleSummary,
} from "@/lib/role-permissions";
import { cn } from "@/lib/utils";

type RoleRow = RoleSummary & {
  activeUsers: number;
  totalUsers: number;
};

type GrantsMap = Record<string, RolePermission[]>;
type ViewTab = "matrix" | "overview";
type PermissionGroup = PermissionDefinition["group"];

const ADMIN_LOCKED: RolePermission[] = ["manage_users", "manage_roles"];

const GROUP_ORDER: PermissionGroup[] = [
  "events",
  "registrations",
  "users",
  "system",
  "mobile",
];

const GROUP_ICONS: Record<PermissionGroup, LucideIcon> = {
  events: Calendar,
  registrations: ClipboardList,
  users: UsersRound,
  system: Settings,
  mobile: Smartphone,
};

function roleIcon(code: string) {
  if (code === "ADMIN") return Shield;
  if (code === "APPROVAL_MANAGER") return UserCog;
  if (code === "EVENT_STAFF") return Smartphone;
  return Shield;
}

function roleDisplayName(
  role: Pick<RoleRow, "code" | "name">,
  t: (key: string) => string
) {
  const key = `roles.${role.code}`;
  const translated = t(key);
  return translated !== key ? translated : role.name;
}

function roleDescription(
  role: Pick<RoleRow, "code" | "name" | "description">,
  t: (key: string) => string
) {
  if (role.description?.trim()) return role.description;
  const key = `admin.roles.description.${role.code}`;
  const translated = t(key);
  return translated !== key ? translated : role.name;
}

function cloneGrants(roles: RoleRow[]): GrantsMap {
  return Object.fromEntries(
    roles.map((role) => [role.id, [...role.permissions]])
  );
}

function isPermissionLocked(roleCode: string, permission: RolePermission) {
  return roleCode === "ADMIN" && ADMIN_LOCKED.includes(permission);
}

function RolesLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/60" />
        ))}
      </div>
      <div className="h-10 w-72 rounded-lg bg-muted/60" />
      <div className="h-96 rounded-xl bg-muted/40" />
    </div>
  );
}

export function RolesPanel() {
  const { t } = useI18n();
  const { confirm, toastError, toastSuccess } = useFeedback();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [catalog, setCatalog] = useState<PermissionDefinition[]>(
    PERMISSION_CATALOG
  );
  const [draft, setDraft] = useState<GrantsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRow | null>(null);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [view, setView] = useState<ViewTab>("matrix");
  const [focusedRoleId, setFocusedRoleId] = useState<string | null>(null);
  const [permissionQuery, setPermissionQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/roles");
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error || t("admin.roles.loadFailed")));
        setRoles([]);
        return;
      }

      const nextRoles = (data.roles ?? []) as RoleRow[];
      setRoles(nextRoles);
      if (Array.isArray(data.catalog) && data.catalog.length > 0) {
        setCatalog(data.catalog);
      }
      setDraft(cloneGrants(nextRoles));
      setFocusedRoleId((current) =>
        current && nextRoles.some((role) => role.id === current)
          ? current
          : (nextRoles[0]?.id ?? null)
      );
    } catch {
      setError(t("admin.roles.loadFailed"));
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const isDirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(cloneGrants(roles));
  }, [draft, roles]);

  const filteredCatalog = useMemo(() => {
    const q = permissionQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((item) =>
      t(`admin.roles.permission.${item.id}`).toLowerCase().includes(q)
    );
  }, [catalog, permissionQuery, t]);

  const groupedCatalog = useMemo(() => {
    const groups = new Map<PermissionGroup, PermissionDefinition[]>();
    for (const group of GROUP_ORDER) groups.set(group, []);
    for (const item of filteredCatalog) {
      groups.get(item.group)?.push(item);
    }
    return GROUP_ORDER.map((group) => ({
      group,
      items: groups.get(group) ?? [],
    })).filter((entry) => entry.items.length > 0);
  }, [filteredCatalog]);

  const stats = useMemo(
    () => ({
      roles: roles.length,
      custom: roles.filter((role) => !role.isSystem).length,
      users: roles.reduce((sum, role) => sum + role.totalUsers, 0),
      permissions: catalog.length,
    }),
    [roles, catalog.length]
  );

  const setRolePermissions = useCallback(
    (roleId: string, permissions: RolePermission[]) => {
      setSuccess("");
      setDraft((current) => ({
        ...current,
        [roleId]: [...permissions],
      }));
    },
    []
  );

  const togglePermission = (
    roleId: string,
    roleCode: string,
    permission: RolePermission
  ) => {
    const current = new Set(draft[roleId] ?? []);
    if (current.has(permission)) {
      if (isPermissionLocked(roleCode, permission)) return;
      current.delete(permission);
    } else {
      current.add(permission);
    }
    setRolePermissions(roleId, [...current]);
  };

  const grantAllForRole = (role: RoleRow) => {
    const all = catalog.map((item) => item.id);
    setRolePermissions(role.id, all);
  };

  const revokeAllForRole = (role: RoleRow) => {
    if (role.code === "ADMIN") {
      setRolePermissions(role.id, [...ADMIN_LOCKED]);
      return;
    }
    setRolePermissions(role.id, []);
  };

  const resetToDefaults = () => {
    setSuccess("");
    setDraft(
      Object.fromEntries(
        roles.map((role) => [
          role.id,
          [
            ...(DEFAULT_SYSTEM_ROLE_PERMISSIONS[
              role.code as keyof typeof DEFAULT_SYSTEM_ROLE_PERMISSIONS
            ] ?? role.permissions),
          ],
        ])
      )
    );
  };

  const discardChanges = () => {
    setSuccess("");
    setError("");
    setDraft(cloneGrants(roles));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    const validation = validateRolePermissionGrants(roles, draft);
    if (!validation.ok) {
      setError(
        validation.reason === "admin_locked"
          ? t("admin.roles.saveAdminLocked")
          : t("admin.roles.saveEmptyRole")
      );
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grants: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error || t("admin.roles.saveFailed")));
        return;
      }
      setSuccess(t("admin.roles.saveSuccess"));
      await load();
    } catch {
      setError(t("admin.roles.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  async function onCreateRole(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error || t("admin.roles.createFailed"));
      return;
    }
    toastSuccess(t("admin.roles.createSuccess"));
    setCreating(false);
    await load();
  }

  async function onEditRole(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingRole) return;
    setEditError("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        description: form.get("description") || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setEditError(data.error || t("admin.roles.editFailed"));
      return;
    }
    toastSuccess(t("admin.roles.editSuccess"));
    setEditingRole(null);
    await load();
  }

  async function onDeleteRole(role: RoleRow) {
    const ok = await confirm({
      title: t("admin.roles.deleteTitle"),
      message: t("admin.roles.deleteMessage", {
        name: roleDisplayName(role, t),
      }),
      confirmLabel: t("admin.common.delete"),
      destructive: true,
    });
    if (!ok) return;

    const res = await fetch(`/api/admin/roles/${role.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toastError(data.error || t("admin.roles.deleteFailed"));
      return;
    }
    toastSuccess(t("admin.roles.deleteSuccess"));
    await load();
  }

  function openRoleInMatrix(roleId: string) {
    setFocusedRoleId(roleId);
    setView("matrix");
  }

  if (loading) return <RolesLoadingSkeleton />;

  if (error && roles.length === 0) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
    );
  }

  return (
    <div className={cn("space-y-6", isDirty && "pb-24")}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: t("admin.roles.statRoles"),
            value: stats.roles,
            icon: Shield,
            tone: "bg-gold/15 text-gold-dark",
          },
          {
            label: t("admin.roles.statCustom"),
            value: stats.custom,
            icon: Plus,
            tone: "bg-sky-500/10 text-sky-800",
          },
          {
            label: t("admin.roles.statUsers"),
            value: stats.users,
            icon: Users,
            tone: "bg-emerald-500/10 text-emerald-800",
          },
          {
            label: t("admin.roles.statPermissions"),
            value: stats.permissions,
            icon: LayoutGrid,
            tone: "bg-violet-500/10 text-violet-800",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm"
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                stat.tone
              )}
            >
              <stat.icon className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-2xl font-bold tabular-nums text-gold-dark">
                {stat.value}
              </p>
              <p className="text-xs text-bronze">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-bronze">{t("admin.roles.intro")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setCreateError("");
              setCreating(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            {t("admin.roles.create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={saving}
          >
            <RotateCcw className="size-4" aria-hidden />
            {t("admin.roles.resetDefaults")}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-error">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <IconTabBar
        value={view}
        onValueChange={(value) => setView(value as ViewTab)}
        items={[
          {
            value: "matrix",
            label: t("admin.roles.tabMatrix"),
            icon: LayoutGrid,
          },
          {
            value: "overview",
            label: t("admin.roles.tabOverview"),
            icon: UsersRound,
          },
        ]}
      />

      {view === "matrix" ? (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-bronze"
              aria-hidden
            />
            <Input
              value={permissionQuery}
              onChange={(e) => setPermissionQuery(e.target.value)}
              placeholder={t("admin.roles.searchPermissions")}
              className="ps-9"
            />
          </div>

          {groupedCatalog.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center text-sm text-bronze">
              {t("admin.roles.noSearchResults")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-[#faf8f5]">
                    <th className="sticky start-0 z-10 bg-[#faf8f5] px-4 py-3 text-start font-medium text-gold-dark">
                      {t("admin.roles.permissionColumn")}
                    </th>
                    {roles.map((role) => {
                      const count = (draft[role.id] ?? []).length;
                      const focused = focusedRoleId === role.id;
                      const Icon = roleIcon(role.code);
                      return (
                        <th
                          key={role.id}
                          className={cn(
                            "min-w-36 px-2 py-3 text-center align-top transition-colors",
                            focused && "bg-gold/10"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setFocusedRoleId(role.id)}
                            className="group mx-auto flex w-full flex-col items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-gold/10"
                          >
                            <span
                              className={cn(
                                "flex size-8 items-center justify-center rounded-lg",
                                focused
                                  ? "bg-gold-dark text-white"
                                  : "bg-gold/15 text-gold-dark"
                              )}
                            >
                              <Icon className="size-4" aria-hidden />
                            </span>
                            <span className="text-xs font-semibold leading-tight text-gold-dark">
                              {roleDisplayName(role, t)}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] tabular-nums"
                            >
                              {t("admin.roles.permissionCount", {
                                count: String(count),
                                total: String(catalog.length),
                              })}
                            </Badge>
                            {role.isSystem ? (
                              <Badge variant="outline" className="text-[10px]">
                                {t("admin.roles.systemBadge")}
                              </Badge>
                            ) : null}
                          </button>
                          <div className="mt-2 flex justify-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => grantAllForRole(role)}
                            >
                              {t("admin.roles.grantAll")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[10px]"
                              onClick={() => revokeAllForRole(role)}
                            >
                              {t("admin.roles.revokeAll")}
                            </Button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {groupedCatalog.map(({ group, items }) => {
                    const GroupIcon = GROUP_ICONS[group];
                    return (
                      <GroupSection
                        key={group}
                        group={group}
                        groupIcon={GroupIcon}
                        items={items}
                        roles={roles}
                        draft={draft}
                        focusedRoleId={focusedRoleId}
                        t={t}
                        onToggle={togglePermission}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => {
            const Icon = roleIcon(role.code);
            const permissions = draft[role.id] ?? [];
            const coverage = Math.round(
              (permissions.length / Math.max(catalog.length, 1)) * 100
            );
            const focused = focusedRoleId === role.id;

            return (
              <article
                key={role.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-card p-4 shadow-sm transition",
                  focused
                    ? "border-gold-dark ring-2 ring-gold/30"
                    : "border-border hover:border-gold/40"
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-dark">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gold-dark">
                        {roleDisplayName(role, t)}
                      </h3>
                      {role.isSystem ? (
                        <Badge variant="outline" className="text-[10px]">
                          {t("admin.roles.systemBadge")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-bronze">
                      {roleDescription(role, t)}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-bronze/70">
                      {role.code}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-bronze">
                    <span>
                      {t("admin.roles.permissionCount", {
                        count: String(permissions.length),
                        total: String(catalog.length),
                      })}
                    </span>
                    <span>{coverage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gold-dark transition-all"
                      style={{ width: `${coverage}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Users className="size-3" aria-hidden />
                    {t("admin.roles.userCount", {
                      active: String(role.activeUsers),
                      total: String(role.totalUsers),
                    })}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {permissions.slice(0, 4).map((permission) => (
                    <span
                      key={permission}
                      className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold-dark"
                    >
                      {t(`admin.roles.permission.${permission}`)}
                    </span>
                  ))}
                  {permissions.length > 4 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-bronze">
                      +{permissions.length - 4}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => openRoleInMatrix(role.id)}
                  >
                    <LayoutGrid className="size-4" aria-hidden />
                    {t("admin.roles.configurePermissions")}
                  </Button>
                  <Link
                    href={`/admin/settings/users?role=${role.code}`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-full text-xs"
                    )}
                  >
                    {t("admin.roles.viewUsers")}
                  </Link>
                  {!role.isSystem ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          setEditError("");
                          setEditingRole(role);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                        {t("admin.roles.editRole")}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs text-error hover:text-error"
                        onClick={() => void onDeleteRole(role)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {t("admin.roles.delete")}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isDirty ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-[#fffdf8]/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gold-dark">
              <span className="size-2 animate-pulse rounded-full bg-amber-500" />
              {t("admin.roles.unsavedChanges")}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={discardChanges}
                disabled={saving}
              >
                {t("admin.roles.discardChanges")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void save()}
                disabled={saving}
              >
                <Save className="size-4" aria-hidden />
                {saving ? t("admin.roles.saving") : t("admin.roles.save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {creating ? (
        <Modal
          title={t("admin.roles.createTitle")}
          onClose={() => {
            setCreating(false);
            setCreateError("");
          }}
        >
          <form onSubmit={onCreateRole} className="space-y-4">
            <TextField name="name" label={t("admin.roles.name")} required />
            <TextField
              name="description"
              label={t("admin.roles.descriptionLabel")}
            />
            <p className="text-xs text-bronze">{t("admin.roles.createHint")}</p>
            {createError ? (
              <p className="text-sm text-error">{createError}</p>
            ) : null}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={Plus}>
                {t("admin.common.create")}
              </PrimaryFormButton>
              <CancelFormButton
                type="button"
                onClick={() => {
                  setCreating(false);
                  setCreateError("");
                }}
              >
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingRole ? (
        <Modal
          title={t("admin.roles.editRoleTitle")}
          onClose={() => {
            setEditingRole(null);
            setEditError("");
          }}
        >
          <form onSubmit={onEditRole} className="space-y-4">
            <TextField
              name="name"
              label={t("admin.roles.name")}
              required
              defaultValue={editingRole.name}
            />
            <TextField
              name="description"
              label={t("admin.roles.descriptionLabel")}
              defaultValue={editingRole.description ?? ""}
            />
            {editError ? <p className="text-sm text-error">{editError}</p> : null}
            <div className="flex gap-3 pt-2">
              <PrimaryFormButton icon={Pencil}>
                {t("admin.common.save")}
              </PrimaryFormButton>
              <CancelFormButton
                type="button"
                onClick={() => {
                  setEditingRole(null);
                  setEditError("");
                }}
              >
                {t("admin.common.cancel")}
              </CancelFormButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function GroupSection({
  group,
  groupIcon: GroupIcon,
  items,
  roles,
  draft,
  focusedRoleId,
  t,
  onToggle,
}: {
  group: PermissionGroup;
  groupIcon: LucideIcon;
  items: PermissionDefinition[];
  roles: RoleRow[];
  draft: GrantsMap;
  focusedRoleId: string | null;
  t: (key: string, vars?: Record<string, string>) => string;
  onToggle: (roleId: string, roleCode: string, permission: RolePermission) => void;
}) {
  return (
    <>
      <tr className="bg-muted/30">
        <td
          colSpan={roles.length + 1}
          className="sticky start-0 z-10 bg-muted/30 px-4 py-2"
        >
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-dark">
            <GroupIcon className="size-4" aria-hidden />
            {t(`admin.roles.group.${group}`)}
          </div>
        </td>
      </tr>
      {items.map((item) => (
        <tr
          key={item.id}
          className="border-b border-border/60 transition hover:bg-[#faf8f5]/80"
        >
          <td className="sticky start-0 z-10 bg-card px-4 py-2.5 text-bronze">
            {t(`admin.roles.permission.${item.id}`)}
          </td>
          {roles.map((role) => {
            const checked = (draft[role.id] ?? []).includes(item.id);
            const locked = isPermissionLocked(role.code, item.id);
            const focused = focusedRoleId === role.id;
            return (
              <td
                key={`${role.id}-${item.id}`}
                className={cn(
                  "px-3 py-2.5 text-center transition-colors",
                  focused && "bg-gold/5"
                )}
              >
                {locked ? (
                  <span
                    title={t("admin.roles.lockedPermission")}
                    className="inline-flex size-4 items-center justify-center text-bronze/60"
                  >
                    <Lock className="size-3.5" aria-hidden />
                  </span>
                ) : (
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(role.id, role.code, item.id)}
                    aria-label={t(`admin.roles.permission.${item.id}`)}
                  />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
