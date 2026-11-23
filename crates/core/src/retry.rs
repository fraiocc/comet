use std::future::Future;
use std::time::Duration;

use crate::error::{CometError, Result};

#[derive(Debug, Clone, Copy)]
pub struct RetryPolicy {
    pub max_attempts: usize,
    pub base_delay: Duration,
    pub max_delay: Duration,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            base_delay: Duration::from_millis(800),
            max_delay: Duration::from_secs(15),
        }
    }
}

impl RetryPolicy {
    pub fn delay_for_attempt(&self, attempt: usize) -> Duration {
        let shift = attempt.saturating_sub(1).min(10) as u32;
        let factor = 1u32.checked_shl(shift).unwrap_or(u32::MAX);
        self.base_delay.saturating_mul(factor).min(self.max_delay)
    }
}

pub fn is_retryable(err: &CometError) -> bool {
    match err {
        CometError::Http(http_err) => {
            http_err.is_timeout() || http_err.is_connect() || http_err.is_request()
        }
        CometError::Api { status, .. } => *status == 429 || (500..=599).contains(status),
        CometError::Publish { reason, .. } => {
            let lower = reason.to_lowercase();
            lower.contains("429")
                || lower.contains("502")
                || lower.contains("503")
                || lower.contains("504")
                || lower.contains("timed out")
                || lower.contains("connection reset")
                || lower.contains("temporarily unavailable")
        }
        _ => false,
    }
}

pub async fn retry_async<T, F, Fut>(policy: &RetryPolicy, mut op: F) -> Result<T>
where
    F: FnMut(usize) -> Fut,
    Fut: Future<Output = Result<T>>,
{
    let attempts = policy.max_attempts.max(1);
    let mut attempt = 1usize;

    loop {
        match op(attempt).await {
            Ok(value) => return Ok(value),
            Err(err) if attempt < attempts && is_retryable(&err) => {
                let delay = policy.delay_for_attempt(attempt);
                tracing::warn!(
                    attempt,
                    max_attempts = attempts,
                    delay_ms = delay.as_millis() as u64,
                    error = %err,
                    "transient error, retrying"
                );
                tokio::time::sleep(delay).await;
                attempt += 1;
            }
            Err(err) => return Err(err),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};

    use super::*;

    fn fast_policy(max_attempts: usize) -> RetryPolicy {
        RetryPolicy {
            max_attempts,
            base_delay: Duration::from_millis(1),
            max_delay: Duration::from_millis(4),
        }
    }

    #[test]
    fn computes_capped_exponential_backoff() {
        let policy = RetryPolicy {
            max_attempts: 5,
            base_delay: Duration::from_millis(500),
            max_delay: Duration::from_secs(3),
        };
        assert_eq!(policy.delay_for_attempt(1), Duration::from_millis(500));
        assert_eq!(policy.delay_for_attempt(2), Duration::from_millis(1000));
        assert_eq!(policy.delay_for_attempt(3), Duration::from_millis(2000));
        assert_eq!(policy.delay_for_attempt(4), Duration::from_secs(3));
    }

    #[test]
    fn classifies_retryable_errors() {
        assert!(is_retryable(&CometError::Api {
            status: 429,
            message: "rate limited".into()
        }));
        assert!(is_retryable(&CometError::Api {
            status: 503,
            message: "unavailable".into()
        }));
        assert!(is_retryable(&CometError::Publish {
            target: "modrinth".into(),
            reason: "upstream 502 bad gateway".into()
        }));
        assert!(!is_retryable(&CometError::Api {
            status: 401,
            message: "unauthorized".into()
        }));
        assert!(!is_retryable(&CometError::Api {
            status: 404,
            message: "not found".into()
        }));
        assert!(!is_retryable(&CometError::Unauthenticated));
    }

    #[tokio::test]
    async fn retries_transient_failure_then_succeeds() {
        let calls = Arc::new(AtomicUsize::new(0));
        let calls_ref = Arc::clone(&calls);

        let value = retry_async(&fast_policy(3), move |_| {
            let calls = Arc::clone(&calls_ref);
            async move {
                let n = calls.fetch_add(1, Ordering::SeqCst) + 1;
                if n < 3 {
                    Err(CometError::Api {
                        status: 503,
                        message: "try again".into(),
                    })
                } else {
                    Ok("ok")
                }
            }
        })
        .await
        .expect("should succeed on third attempt");

        assert_eq!(value, "ok");
        assert_eq!(calls.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn stops_immediately_on_non_retryable_error() {
        let calls = Arc::new(AtomicUsize::new(0));
        let calls_ref = Arc::clone(&calls);

        let err = retry_async(&fast_policy(4), move |_| {
            let calls = Arc::clone(&calls_ref);
            async move {
                calls.fetch_add(1, Ordering::SeqCst);
                Err::<(), _>(CometError::Api {
                    status: 400,
                    message: "bad request".into(),
                })
            }
        })
        .await
        .unwrap_err();

        assert!(matches!(err, CometError::Api { status: 400, .. }));
        assert_eq!(calls.load(Ordering::SeqCst), 1);
    }
}
