use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Content too long")]
    ContentTooLong,
    #[msg("Amount below required price")]
    Underpriced,
    #[msg("Unauthorized")]
    Unauthorized,
}