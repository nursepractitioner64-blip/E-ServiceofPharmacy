
const base = "/api/estockscan/dispense";
async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: { ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) throw new Error(data.message || `HTTP ${response.status}`);
  return data;
}
export async function getDispenseLots(medicineName) {
  const result = await request(`${base}/lots?medicine_name=${encodeURIComponent(medicineName)}`);
  return result.data || [];
}
export async function submitDispense(payload) {
  return request(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
export async function getDispenseItem(qrValue) {
  const result = await request(`${base}/lookup/${encodeURIComponent(qrValue)}`);
  return result.data;
}
