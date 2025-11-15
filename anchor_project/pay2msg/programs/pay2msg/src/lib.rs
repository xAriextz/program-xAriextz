use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};

pub mod constants;
pub mod state;
pub mod errors;

use crate::constants::{PROFILE_SEED, MESSAGE_SEED, MAX_CONTENT_LEN, MESSAGE_MAX_SPACE};
use crate::state::{UserProfile, Message};
use crate::errors::ErrorCode;

declare_id!("Eq4oinoryPeSe3yL664Ux8q7FgdGRXTweW9uqVUTvn4n");

#[program]
pub mod pay2msg {
    use super::*;

    pub fn register_user(ctx: Context<RegisterUser>, price_lamports: u64) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.owner.key();
        profile.price_lamports = price_lamports;
        profile.inbox_count = 0;
        profile.received_total = 0;
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.bump = ctx.bumps.profile;
        Ok(())
    }

    pub fn update_price(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
        let profile = &mut ctx.accounts.profile;

        require_keys_eq!(profile.owner, ctx.accounts.owner.key(), ErrorCode::Unauthorized);

        profile.price_lamports = new_price;
        Ok(())
    }

    pub fn send_message(
        ctx: Context<SendMessage>,
        amount_lamports: u64,
        content: String,
    ) -> Result<()> {
        require!(
            content.as_bytes().len() <= MAX_CONTENT_LEN,
            ErrorCode::ContentTooLong
        );

        let profile = &ctx.accounts.recipient_profile;
        require!(
            amount_lamports >= profile.price_lamports,
            ErrorCode::Underpriced
        );


        let sender = &ctx.accounts.sender;
        let message = &ctx.accounts.message;
        let system_program = &ctx.accounts.system_program;

        let cpi_ctx = CpiContext::new(
            system_program.to_account_info(),
            Transfer {
                from: sender.to_account_info(),
                to: message.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, amount_lamports)?;

        let msg_account = &mut ctx.accounts.message;
        msg_account.sender = sender.key();
        msg_account.recipient = ctx.accounts.recipient.key();
        msg_account.amount_lamports = amount_lamports;
        msg_account.created_at = Clock::get()?.unix_timestamp;
        msg_account.read = false;
        msg_account.content = content;
        msg_account.bump = ctx.bumps.message;

        let recipient_profile = &mut ctx.accounts.recipient_profile;
        recipient_profile.inbox_count = recipient_profile.inbox_count.checked_add(1).unwrap();

        Ok(())
    }

    pub fn read_and_claim(ctx: Context<ReadAndClaim>) -> Result<()> {
        let recipient = &mut ctx.accounts.recipient;
        let profile = &mut ctx.accounts.recipient_profile;
        let message = &mut ctx.accounts.message;

        require_keys_eq!(message.recipient, recipient.key(), ErrorCode::Unauthorized);

        let amount = message.amount_lamports;

        **message.to_account_info().try_borrow_mut_lamports()? -= amount;
        **recipient.to_account_info().try_borrow_mut_lamports()? += amount;

        profile.received_total = profile
            .received_total
            .checked_add(amount)
            .unwrap();

        message.read = true;

        Ok(())
    }

}

#[derive(Accounts)]
#[instruction(price_lamports: u64)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + UserProfile::SPACE,
        seeds = [PROFILE_SEED, owner.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(
        mut,
        seeds = [PROFILE_SEED, owner.key().as_ref()],
        bump = profile.bump
    )]
    pub profile: Account<'info, UserProfile>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(salt: u64)]
pub struct SendMessage<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,

    /// CHECK: only used as key
    pub recipient: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [PROFILE_SEED, recipient.key().as_ref()],
        bump = recipient_profile.bump
    )]
    pub recipient_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = sender,
        space = MESSAGE_MAX_SPACE,
        seeds = [
            MESSAGE_SEED,
            recipient.key().as_ref(),
            sender.key().as_ref(),
            &salt.to_le_bytes(),
        ],
        bump
    )]
    pub message: Account<'info, Message>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReadAndClaim<'info> {
    #[account(mut)]
    pub recipient: Signer<'info>,

    #[account(
        mut,
        seeds = [PROFILE_SEED, recipient.key().as_ref()],
        bump = recipient_profile.bump
    )]
    pub recipient_profile: Account<'info, UserProfile>,

    #[account(
        mut,
        close = recipient,
    )]
    pub message: Account<'info, Message>,
}
