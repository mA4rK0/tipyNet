use crate::errors::TipyError;
use crate::states::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};

#[derive(Accounts)]
#[instruction(amount: u64, message: String)]
pub struct SendTip<'info> {
    #[account(
        init,
        payer = sender,
        space = 8 + DataTransaction::INIT_SPACE,
        seeds = [
            b"tip_transaction",
            sender.key().as_ref(),
            receiver.key().as_ref(),
        ],
        bump
    )]
    pub data_transaction: Account<'info, DataTransaction>,

    /// CHECK: Validated in handler
    pub token_mint: AccountInfo<'info>,

    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: Receiver doesn't need to sign
    #[account(mut)]
    pub receiver: AccountInfo<'info>,

    /// CHECK: Validated manually in handler
    #[account(mut)]
    pub sender_token_account: AccountInfo<'info>,

    /// CHECK: Validated manually in handler
    #[account(mut)]
    pub receiver_token_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn send_tip(ctx: Context<SendTip>, amount: u64, message: String) -> Result<()> {
    require!(message.len() <= 100, TipyError::MessageTooLong);

    let clock = Clock::get()?;
    let transaction = &mut ctx.accounts.data_transaction;

    transaction.sender = ctx.accounts.sender.key();
    transaction.receiver = ctx.accounts.receiver.key();
    transaction.amount = amount;
    transaction.message = message;
    transaction.timestamp = clock.unix_timestamp;
    transaction.is_sol = ctx.accounts.token_mint.key() == Pubkey::default();

    if transaction.is_sol {
        // Transfer SOL
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.sender.to_account_info(),
                    to: ctx.accounts.receiver.to_account_info(),
                },
            ),
            amount,
        )?;
    } else {
        // Manual validation for token accounts using try_borrow_data
        {
            let sender_data = ctx.accounts.sender_token_account.try_borrow_data()?;
            let sender_account =
                anchor_spl::token::TokenAccount::try_deserialize(&mut sender_data.as_ref())?;

            let receiver_data = ctx.accounts.receiver_token_account.try_borrow_data()?;
            let receiver_account =
                anchor_spl::token::TokenAccount::try_deserialize(&mut receiver_data.as_ref())?;

            require!(
                ctx.accounts.token_mint.key() != Pubkey::default(),
                TipyError::InvalidTokenAccount
            );
            require!(
                sender_account.mint == ctx.accounts.token_mint.key(),
                TipyError::InvalidTokenAccount
            );
            require!(
                receiver_account.mint == ctx.accounts.token_mint.key(),
                TipyError::InvalidTokenAccount
            );
            require!(
                sender_account.owner == ctx.accounts.sender.key(),
                TipyError::InvalidTokenAccount
            );
        }

        // Transfer SPL token
        let cpi_accounts = Transfer {
            from: ctx.accounts.sender_token_account.to_account_info(),
            to: ctx.accounts.receiver_token_account.to_account_info(),
            authority: ctx.accounts.sender.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;
    }

    Ok(())
}
