import { keccak256, toFunctionSelector } from 'viem';

import { viemChainFor } from './chain';
import { nextIndexRange, safeHead, shouldAdvanceCursor } from './cursor';
import { KEYSTORE_ABI } from './keystore-abi';
import { keyIdFromPublicKey, parseAddress, parseKeyId } from './keystore';
import { resolveReceipt, shouldDrop } from './receipt';

describe('chain public client', () => {
  it('selects BSC, testnet or Ethereum from ALTANA_CHAIN ids', () => {
    expect(viemChainFor(56).id).toBe(56);
    expect(viemChainFor(97).id).toBe(97);
    expect(viemChainFor(1).id).toBe(1);
    expect(viemChainFor(56).name).toBe('BNB Smart Chain');
  });
});

describe('indexer cursor', () => {
  it('holds back a reorg buffer from the chain head', () => {
    expect(safeHead(100n)).toBe(92);
    expect(safeHead(3)).toBe(0);
  });

  it('rewinds the last committed block so a short reorg is re-applied', () => {
    expect(nextIndexRange(100, 200)).toEqual({ from: 93, to: 200 });
    expect(nextIndexRange(200, 192)).toBeNull();
  });

  it('does not advance a cursor backwards', () => {
    expect(shouldAdvanceCursor(50, 50)).toBe(false);
    expect(shouldAdvanceCursor(50, 51)).toBe(true);
  });
});

describe('receipt finality', () => {
  it('stays submitted until a receipt exists', () => {
    expect(resolveReceipt(null, 10n).status).toBe('submitted');
  });

  it('marks a reverted receipt even with confirmations', () => {
    expect(
      resolveReceipt({ status: 'reverted', blockNumber: 9n, gasUsed: 21_000n }, 12).status,
    ).toBe('reverted');
  });

  it('waits for confirmations before succeeding', () => {
    expect(
      resolveReceipt({ status: 'success', blockNumber: 10n }, 10, 2).status,
    ).toBe('included');
    expect(
      resolveReceipt({ status: 'success', blockNumber: 10n }, 11, 2).status,
    ).toBe('succeeded');
  });

  it('drops a hash that never lands', () => {
    const submittedAt = new Date(Date.now() - 31 * 60 * 1000);
    expect(shouldDrop(submittedAt)).toBe(true);
    expect(shouldDrop(new Date())).toBe(false);
  });
});

describe('keystore ids', () => {
  it('lowercases addresses and key ids on ingest', () => {
    expect(parseAddress('0xAABBCCDDEEFF00112233445566778899AABBCCDD')).toBe(
      '0xaabbccddeeff00112233445566778899aabbccdd',
    );
    expect(parseAddress('not-an-address')).toBeNull();
    expect(
      parseKeyId(
        '0x1111111111111111111111111111111111111111111111111111111111111111',
      ),
    ).toMatch(/^0x11+$/);
  });

  it('derives keyId as keccak256 of the SEC1 public key', () => {
    const publicKey =
      '0x04aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    expect(keyIdFromPublicKey(publicKey)).toBe(keccak256(publicKey));
  });

  it('exposes isValidKey as a view, not a grant', () => {
    const item = KEYSTORE_ABI.find((row) => row.name === 'isValidKey');
    expect(item?.stateMutability).toBe('view');
    expect(toFunctionSelector('isValidKey(address,bytes32)')).toMatch(/^0x/);
  });
});
