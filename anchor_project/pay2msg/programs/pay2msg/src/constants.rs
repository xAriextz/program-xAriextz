use anchor_lang::prelude::*;

pub const PROFILE_SEED: &[u8] = b"profile";
pub const MESSAGE_SEED: &[u8] = b"message";

pub const MAX_CONTENT_LEN: usize = 256;
pub const MESSAGE_MAX_SPACE: usize =
    8 + 32 + 32 + 8 + 8 + 1 + 1 + 4 + MAX_CONTENT_LEN;
