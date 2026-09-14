# TG TOP NFT Transfer Design

## Product boundary

TG TOP will support peer-to-peer NFT transfers with **0% TG TOP commission**. The platform will never take custody of an on-chain asset or request a user’s seed phrase. An on-chain transfer is signed and broadcast by the sender’s connected wallet; the unavoidable TON network fee is shown before confirmation. TG TOP must not describe that network fee as a platform fee.

| Category | Ownership evidence | Transfer action | Fee disclosure |
|---|---|---|---|
| **On-chain** | NFT item address, current owner address, collection metadata, and latest on-chain verification | Sender signs a transfer from the connected wallet to a verified recipient wallet | **TG TOP fee: 0%**; TON network fee is estimated or shown by the wallet |
| **Off-chain** | TG TOP asset record, verified account ownership, and audit history | Sender confirms a transfer to a verified TG TOP account; server records a state transition | **TG TOP fee: 0%**; no blockchain-network fee unless the asset is later withdrawn or bridged |

## Required transfer lifecycle

1. The sender selects one or more NFTs from their verified inventory and enters an `@username` or Telegram ID.
2. TG TOP resolves the recipient only to a verified TG TOP profile. The confirmation view shows the recipient’s display name, Telegram handle or ID fragment, asset count, category, and fee disclosure.
3. **On-chain:** the server prepares a short-lived transfer intent. The client constructs the standard NFT transfer request and asks the wallet to sign. The transfer remains `broadcast_pending` until the relevant NFT item is verified on-chain with the intended new owner.
4. **Off-chain:** TG TOP creates an immutable transfer record and atomically moves the internal ownership record only after the sender’s explicit final confirmation.
5. The history records who initiated, accepted or received, the source and recipient profile, timestamps, wallet addresses where applicable, transaction reference, and terminal outcome. No transfer is silently retried.

## Safety controls

- Do not allow a username alone to imply a wallet address. For an on-chain NFT, the recipient must have a verified current wallet address or explicitly connect one before the transfer is enabled.
- Wallet-address verification requires **TON Connect `ton_proof`**: TG TOP must issue a short-lived, single-use backend nonce; validate the signed proof against the exact `tgtop.xyz` domain, expected network, timestamp, wallet `stateInit`, and derived account address; then atomically consume that nonce. A connection alone is not ownership proof.
- Re-read the NFT item’s owner before preparing the signature and verify the post-broadcast result. The standard is asynchronous, so a pre-flight owner response is not final evidence.
- Require an explicit mainnet network identifier, a short `validUntil` interval, a full asset review, and a user-visible cancellation path before signing.
- Treat wallet rejection, expiry, broadcast failure, and mismatched final owner as distinct audit states. Batch transfers are not assumed atomic.
- Do not offer reversals for successful on-chain transfers. For off-chain transfers, reversal requires a separate auditable action and must be prohibited once external withdrawal or sale begins.

## Technical references

The TON NFT standard models every NFT item as its own smart-contract account. The current owner sends `transfer#5fcc3d14` to that item contract; the contract updates the owner when execution succeeds.[1][2] TON Connect `sendTransaction` prompts the connected wallet to sign and broadcast the request. The official guidance requires an explicit network identifier, warns that mainnet transfers are irreversible, and recommends verifying the returned broadcast result on-chain.[3]

TON Connect’s proof flow additionally requires a server-issued, single-use payload and backend Ed25519 validation over the wallet’s proof. The dApp must validate the exact domain, acceptance window, network, state-init-derived address, and nonce before treating a wallet as verified.[4]

### References

[1]: https://docs.ton.org/contracts/standard/tokens/nft/overview "TON Docs — NFT overview"
[2]: https://github.com/ton-blockchain/TEPs/blob/master/text/0062-nft-standard.md "TEP-62 — NFT Standard"
[3]: https://docs.ton.org/applications/ton-connect/how-to/send-transaction "TON Docs — Send a transaction with TON Connect"
[4]: https://docs.ton.org/applications/ton-connect/how-to/ton-proof "TON Docs — Authenticate users with ton_proof"
