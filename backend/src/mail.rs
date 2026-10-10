//! Outgoing e-mail over SMTP (self-hosted mail server).
//!
//! Port 465 uses implicit TLS; any other port uses STARTTLS (required).

use lettre::message::{header::ContentType, Mailbox, MultiPart, SinglePart};
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::config::Config;

/// Returns true when the SMTP settings needed to send mail are present.
pub fn is_configured(config: &Config) -> bool {
    !config.smtp_host.is_empty() && !config.smtp_from.is_empty()
}

/// Send a multipart (text + HTML) e-mail to a single recipient.
pub async fn send(
    config: &Config,
    to: &str,
    subject: &str,
    text: String,
    html: String,
) -> Result<(), String> {
    let from: Mailbox = config
        .smtp_from
        .parse()
        .map_err(|e| format!("invalid SMTP_FROM: {e}"))?;
    let to: Mailbox = to.parse().map_err(|e| format!("invalid recipient: {e}"))?;

    let message = Message::builder()
        .from(from)
        .to(to)
        .subject(subject)
        .multipart(
            MultiPart::alternative()
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_PLAIN)
                        .body(text),
                )
                .singlepart(
                    SinglePart::builder()
                        .header(ContentType::TEXT_HTML)
                        .body(html),
                ),
        )
        .map_err(|e| format!("failed to build message: {e}"))?;

    let builder = if config.smtp_port == 465 {
        AsyncSmtpTransport::<Tokio1Executor>::relay(&config.smtp_host)
    } else {
        AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.smtp_host)
    }
    .map_err(|e| format!("invalid SMTP_HOST: {e}"))?
    .port(config.smtp_port);

    let builder = if config.smtp_user.is_empty() {
        builder
    } else {
        builder.credentials(Credentials::new(
            config.smtp_user.clone(),
            config.smtp_password.clone(),
        ))
    };

    builder
        .build()
        .send(message)
        .await
        .map(|_| ())
        .map_err(|e| format!("SMTP send failed: {e}"))
}
