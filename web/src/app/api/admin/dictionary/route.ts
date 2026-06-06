import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  AUDIT_ACTIONS,
  auditActorFromSession,
  recordAudit,
} from "@/lib/audit-log";
import { auth, canManageDictionary } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { namespaceFromKey } from "@/lib/i18n/catalog";
import { apiT } from "@/lib/i18n/api";
import type { Prisma } from "@/generated/prisma/client";
import {
  paginatedResponse,
  parseColumnFilters,
  parsePagination,
  parseSort,
} from "@/lib/admin-table-query";

const ENTRY_SORT = ["key", "namespace", "value"] as const;
const ENTRY_FILTER = ["key", "namespace", "value"] as const;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageDictionary(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const localeCode = searchParams.get("localeCode");

  if (localeCode && searchParams.has("page")) {
    const locale = await prisma.locale.findUnique({ where: { code: localeCode } });
    if (!locale) {
      return NextResponse.json(
        paginatedResponse([], 0, 1, parsePagination(searchParams).pageSize)
      );
    }

    const { page, pageSize, skip, take } = parsePagination(searchParams);
    const { sort, order } = parseSort(searchParams, ENTRY_SORT, "key");
    const filters = parseColumnFilters(searchParams, ENTRY_FILTER);

    const where: Prisma.DictionaryEntryWhereInput = {
      localeId: locale.id,
      ...(filters.key
        ? { key: { contains: filters.key, mode: "insensitive" } }
        : {}),
      ...(filters.namespace
        ? { namespace: { contains: filters.namespace, mode: "insensitive" } }
        : {}),
      ...(filters.value
        ? { value: { contains: filters.value, mode: "insensitive" } }
        : {}),
    };

    const orderBy: Prisma.DictionaryEntryOrderByWithRelationInput =
      sort === "namespace"
        ? { namespace: order }
        : sort === "value"
          ? { value: order }
          : { key: order };

    const [total, entries] = await Promise.all([
      prisma.dictionaryEntry.count({ where }),
      prisma.dictionaryEntry.findMany({ where, orderBy, skip, take }),
    ]);

    return NextResponse.json(
      paginatedResponse(
        entries.map((e) => ({
          id: e.id,
          key: e.key,
          value: e.value,
          namespace: e.namespace,
        })),
        total,
        page,
        pageSize
      )
    );
  }

  const locales = await prisma.locale.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { entries: true } },
    },
  });

  return NextResponse.json(
    locales.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      direction: l.direction,
      isDefault: l.isDefault,
      isActive: l.isActive,
      sortOrder: l.sortOrder,
      entryCount: l._count.entries,
    }))
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageDictionary(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  let body: { code?: string; name?: string; direction?: string; cloneFrom?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const code = body.code?.trim().toLowerCase();
  const name = body.name?.trim();
  if (!code || !name) {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const exists = await prisma.locale.findUnique({ where: { code } });
  if (exists) {
    return NextResponse.json({ error: "Locale code already exists" }, { status: 409 });
  }

  const maxOrder = await prisma.locale.aggregate({ _max: { sortOrder: true } });

  const locale = await prisma.locale.create({
    data: {
      code,
      name,
      direction: body.direction === "ltr" ? "ltr" : "rtl",
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
    },
  });

  if (body.cloneFrom) {
    const source = await prisma.locale.findUnique({
      where: { code: body.cloneFrom },
      include: { entries: true },
    });
    if (source?.entries.length) {
      await prisma.dictionaryEntry.createMany({
        data: source.entries.map((e) => ({
          localeId: locale.id,
          key: e.key,
          value: e.value,
          namespace: e.namespace,
        })),
      });
    }
  }

  revalidateTag("dictionary", "max");
  return NextResponse.json(locale, { status: 201 });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !(await canManageDictionary(session.user.roleId))) {
    return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
  }

  let body: {
    localeCode?: string;
    entries?: { key: string; value: string; namespace?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  const locale = await prisma.locale.findUnique({
    where: { code: body.localeCode },
  });
  if (!locale || !body.entries?.length) {
    return NextResponse.json({ error: await apiT("api.invalidData") }, { status: 400 });
  }

  for (const entry of body.entries) {
    const key = entry.key.trim();
    if (!key) continue;
    await prisma.dictionaryEntry.upsert({
      where: { localeId_key: { localeId: locale.id, key } },
      update: {
        value: entry.value,
        namespace: entry.namespace ?? namespaceFromKey(key),
      },
      create: {
        localeId: locale.id,
        key,
        value: entry.value,
        namespace: entry.namespace ?? namespaceFromKey(key),
      },
    });
  }

  revalidateTag("dictionary", "max");

  await recordAudit({
    action: AUDIT_ACTIONS.DICTIONARY_UPDATE,
    actor: auditActorFromSession(session.user),
    entityType: "dictionary",
    entityId: locale.id,
    entityLabel: locale.code,
    metadata: { keysUpdated: body.entries.length },
    req,
  });

  return NextResponse.json({ ok: true });
}
