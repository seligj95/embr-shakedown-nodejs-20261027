const response = await fetch('/api/data');
if (!response.ok) throw new Error(`Synthetic API returned ${response.status}`);
const data = await response.json();
document.querySelector('#backend').textContent = `Backend ${data.marker}: ${data.message}`;
