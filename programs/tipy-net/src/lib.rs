#![allow(unexpected_cfgs)]
#![allow(deprecated)]

use anchor_lang::prelude::*;

declare_id!("E4dEFDBfgF7vACjTRez7v4Bqk8ZUrbrryT26m6HiDWQh");

pub mod errors;
pub mod instructions;
pub mod states;

use instructions::*;

#[program]
pub mod tipy_net {
    use super::*;

    pub fn send_tip(ctx: Context<SendTip>, amount: u64, message: String) -> Result<()> {
        send_transaction::send_tip(ctx, amount, message)
    }
}
