async function handleResponse(res) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.error || (data.errors && data.errors.join(', ')) || message;
    } catch {
      // response body wasn't JSON, fall back to statusText
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('text/csv')) return res.text();
  return res.json();
}

export const api = {
  get: (path) => fetch(`/api${path}`).then(handleResponse),

  post: (path, body) =>
    fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(handleResponse),

  postCsv: (path, csvText) =>
    fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csvText
    }).then(handleResponse),

  put: (path, body) =>
    fetch(`/api${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(handleResponse),

  del: (path) => fetch(`/api${path}`, { method: 'DELETE' }).then(handleResponse)
};
