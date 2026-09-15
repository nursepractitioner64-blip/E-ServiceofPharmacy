export async function getEmergencySummary() {
  const res = await fetch(`/api/emergencycheck/summary?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json.data;
}

export async function getEmergencyItems() {
  const res = await fetch(`/api/emergencycheck/items?t=${Date.now()}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);
  return json.data;
}
