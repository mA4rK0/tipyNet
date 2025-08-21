use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct DataTransaction {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub amount: u64,
    #[max_len(100)]
    pub message: String,
    pub timestamp: i64,
    pub is_sol: bool,
}
