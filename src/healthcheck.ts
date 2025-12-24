const URI = process.env.URI ?? `http://localhost:5454/health`;
const response = await fetch(URI);
if (!response.ok) {
  throw new Error("Failed to fetch health");
}
