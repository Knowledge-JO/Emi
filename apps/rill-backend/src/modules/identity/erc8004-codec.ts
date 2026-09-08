export const ERC8004_DATA_URI_PREFIX = 'data:application/json;base64,';

export type Erc8004RegistrationFile = {
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  services?: Array<{ name: string; endpoint: string; version?: string }>;
  registrations?: Array<{ agentId: number; agentRegistry: string }>;
};

export type DecodedAgentUri =
  | { kind: 'record'; record: Erc8004RegistrationFile }
  | { kind: 'https'; url: string }
  | { kind: 'opaque'; uri: string };

/**
 * Parse a tokenURI. Official records are `data:application/json;base64,…`.
 * An https URI is a pointer, not a record we invented.
 */
export function decodeAgentUri(uri: string): DecodedAgentUri {
  if (uri.startsWith(ERC8004_DATA_URI_PREFIX)) {
    const bytes = Buffer.from(uri.slice(ERC8004_DATA_URI_PREFIX.length), 'base64');
    const record = JSON.parse(bytes.toString('utf8')) as Erc8004RegistrationFile;
    return { kind: 'record', record };
  }
  if (uri.startsWith('https://') || uri.startsWith('http://')) {
    return { kind: 'https', url: uri };
  }
  return { kind: 'opaque', uri };
}

export function endpointFromRecord(
  record: Erc8004RegistrationFile,
): string | null {
  const service = record.services?.find((item) => item.endpoint);
  return service?.endpoint ?? null;
}

export function encodeAgentUri(record: Erc8004RegistrationFile): string {
  return ERC8004_DATA_URI_PREFIX + Buffer.from(JSON.stringify(record), 'utf8').toString('base64');
}

export function listingMatchesOnchain(
  listingName: string,
  decoded: DecodedAgentUri,
): boolean {
  if (decoded.kind !== 'record' || !decoded.record.name) {
    return false;
  }

  return (
    decoded.record.name.trim().toLowerCase() === listingName.trim().toLowerCase()
  );
}
