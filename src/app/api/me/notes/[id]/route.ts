import type { NextRequest } from "next/server";
import { deps } from "@/account/deps";
import { gateway } from "@/account/gateway";
import { handleReader } from "@/account/handlers";
import { changeNote, deleteNote } from "@/account/saved-data";

type Context = { params: Promise<{ id: string }> };

// Changes the text of one note.
export async function PUT(request: NextRequest, { params }: Context) {
  const [{ id }, value] = await Promise.all([params, request.json().catch((): unknown => null)]);
  return handleReader(request, deps, (token) => changeNote(gateway, token, id, value));
}

// Deletes one note.
export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  return handleReader(request, deps, (token) => deleteNote(gateway, token, id));
}
