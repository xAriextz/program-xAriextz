use anchor_lang::prelude::*;

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub price_lamports: u64,
    pub inbox_count: u64,
    pub received_total: u64,
    pub created_at: i64,
    pub bump: u8,
}

impl UserProfile {
    pub const SPACE: usize =
        32 +
        8  +
        8  +
        8  +
        8  +
        1;
}

#[account]
pub struct Message {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub amount_lamports: u64,
    pub created_at: i64,
    pub read: bool,
    pub content: String,
    pub bump: u8,
}

impl Message {
    pub const SPACE_PREFIX: usize =
        32 +
        32 +
        8  +
        8  +
        1  +
        1;

    pub fn space_with_content(max_len: usize) -> usize {
        8 + Self::SPACE_PREFIX + 4 + max_len
    }
}