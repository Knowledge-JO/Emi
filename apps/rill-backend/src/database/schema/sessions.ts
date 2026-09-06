// TODO: sessions table — Altana session keys. Stores ONLY the output of serializeSession plus the
// session public key and a reference to the secret store entry. The raw Session is never
// JSON.stringify'd (it throws on bigint limits and embeds the private key), and the private key
// never lands in Postgres.
