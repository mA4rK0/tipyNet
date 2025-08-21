use anchor_lang::prelude::*;

#[error_code]
pub enum TipyError {
    #[msg("Message exceeds 100 character limit")]
    MessageTooLong,
    #[msg("Insufficient funds for transfer")]
    InsufficientFunds,
    #[msg("Invalid token account")]
    InvalidTokenAccount,
    #[msg("Receiver token account not initialized")]
    ReceiverTokenAccountNotInitialized,
    #[msg("Clock error")]
    ClockError,
}
