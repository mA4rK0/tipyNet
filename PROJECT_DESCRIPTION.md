# Project Description

**Deployed Frontend URL:** [TODO: Link to your deployed frontend]

**Solana Program ID:** E4dEFDBfgF7vACjTRez7v4Bqk8ZUrbrryT26m6HiDWQh

## Project Overview

### Description

Tipy-Net is a decentralized tipping application built on Solana that allows users to send tips in both SOL and SPL tokens with personalized messages. The platform enables seamless transactions between users while maintaining a record of all tipping interactions on-chain. Each transaction is stored with details including sender, receiver, amount, message, and timestamp, creating a transparent and verifiable tipping history.

### Key Features

- **Dual Currency Support**: Send tips using either SOL or any SPL token
- **Personalized Messages**: Attach messages up to 100 characters with each tip
- **Transaction History**: View complete history of sent and received tips
- **Wallet Integration**: Seamless connection with popular Solana wallets like Phantom and Solflare
- **Real-time Updates**: Instant confirmation and update of transaction status

### How to Use the dApp

1. **Connect Wallet** - Connect your Solana wallet using the wallet adapter
2. **Select Recipient** - Enter the recipient's wallet address
3. **Choose Amount** - Specify the amount to send (in SOL or tokens)
4. **Add Message** - Optionally include a message (max 100 characters)
5. **Send Tip** - Confirm and send the transaction
6. **View History** - Check the history tab to see all past transactions

## Program Architecture

The Tipy-Net dApp uses a structured architecture with one main account type and a core instruction for sending tips. The program leverages PDAs to create unique transaction records for each tip sent.

### PDA Usage

The program uses Program Derived Addresses to create deterministic transaction accounts for each tip transaction.

**PDAs Used:**

- **Transaction PDA**: Derived from seeds `["tip_transaction", sender_pubkey, receiver_pubkey]` - ensures each transaction has a unique account

### Program Instructions

**Instructions Implemented:**

- **SendTip**: Creates a new transaction account and transfers specified amount (SOL or SPL tokens) to recipient

### Account Structure

```rust
#[account]
#[derive(InitSpace)]
pub struct DataTransaction {
    pub sender: Pubkey,        // The wallet that sent the tip
    pub receiver: Pubkey,      // The wallet that received the tip
    pub amount: u64,           // Amount tipped
    #[max_len(100)]
    pub message: String,       // Accompanying message
    pub timestamp: i64,        // Unix timestamp when tip was sent
    pub is_sol: bool,          // Whether the tip was in SOL or SPL tokens
}
```

## Testing

### Test Coverage

Comprehensive test suite covering transaction functionality with both SOL and SPL tokens, including extensive error handling.

**Happy Path Tests:**

- **SOL Transfer**: Successfully sends SOL with message and verifies transaction account
- **SPL Token Transfer**: Successfully sends SPL tokens with message and verifies token balances
- **Transaction Account Creation**: Properly creates and initializes transaction accounts

**Unhappy Path Tests:**

- **Message Too Long**: Fails when message exceeds 100 characters (MessageTooLong error)
- **Insufficient Funds**: Fails when sender has insufficient SOL balance
- **Invalid Token Account**: Fails when token accounts have wrong mint (InvalidTokenAccount error)
- **Token Account Validation**: Properly validates both sender and receiver token accounts

### Running Tests

```bash
yarn install    # install dependencies
anchor test     # run tests
```

### Additional Notes for Evaluators

This is a fully functional tipping dApp with support for both SOL and SPL tokens. The test suite is comprehensive and covers both success and failure scenarios. The program includes proper error handling for common scenarios like insufficient funds, invalid token accounts, and message length validation. The implementation demonstrates understanding of PDAs, token program integration, and transaction processing on Solana.

The frontend features a modern neon-themed UI with responsive design and transaction history caching. The biggest challenges were handling both SOL and SPL token transfers in a single instruction and properly validating token accounts, which have been thoroughly tested in the test suite.
