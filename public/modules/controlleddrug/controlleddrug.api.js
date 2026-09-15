export async function getControlledSummary() {
  const res = await fetch(`/api/controlleddrug/summary?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json.data;
}

export async function getControlledStock() {
  const res = await fetch(`/api/controlleddrug/stock?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json.data;
}

export async function getControlledMovement() {
  const res = await fetch(`/api/controlleddrug/movement?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json.data;
}
