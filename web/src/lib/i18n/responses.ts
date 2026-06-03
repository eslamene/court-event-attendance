import { NextResponse } from "next/server";
import { apiT } from "./api";

export async function jsonUnauthorized() {
  return NextResponse.json({ error: await apiT("api.unauthorized") }, { status: 401 });
}

export async function jsonForbidden() {
  return NextResponse.json({ error: await apiT("api.forbidden") }, { status: 403 });
}

export async function jsonInvalidData(message?: string) {
  return NextResponse.json(
    { error: message ?? (await apiT("api.invalidData")) },
    { status: 400 }
  );
}
