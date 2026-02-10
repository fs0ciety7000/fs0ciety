use axum::extract::{Multipart, State};
use axum::Json;
use serde_json::{json, Value};
use tracing::{info, warn};

use crate::error::AppError;
use crate::middleware::AuthUser;
use crate::AppState;

const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR: &str = "/data/uploads";

/// Strip EXIF metadata from JPEG images to preserve author anonymity.
/// Removes APP1 (EXIF/XMP) segments that may contain GPS, camera model, etc.
fn strip_exif_jpeg(data: &[u8]) -> Vec<u8> {
    use img_parts::jpeg::Jpeg;
    use img_parts::ImageEXIF;
    use std::io::Cursor;

    match Jpeg::from_bytes(data.to_vec().into()) {
        Ok(mut jpeg) => {
            jpeg.set_exif(None);
            let mut out = Vec::new();
            if jpeg.encoder().write_to(&mut Cursor::new(&mut out)).is_ok() {
                info!("EXIF metadata stripped from JPEG upload");
                out
            } else {
                warn!("Failed to re-encode JPEG after EXIF strip, using original");
                data.to_vec()
            }
        }
        Err(_) => {
            warn!("Failed to parse JPEG for EXIF stripping, using original");
            data.to_vec()
        }
    }
}

/// Strip metadata from PNG images (tEXt, iTXt, zTXt chunks).
fn strip_exif_png(data: &[u8]) -> Vec<u8> {
    use img_parts::png::Png;
    use img_parts::ImageEXIF;
    use std::io::Cursor;

    match Png::from_bytes(data.to_vec().into()) {
        Ok(mut png) => {
            png.set_exif(None);
            let mut out = Vec::new();
            if png.encoder().write_to(&mut Cursor::new(&mut out)).is_ok() {
                info!("EXIF metadata stripped from PNG upload");
                out
            } else {
                warn!("Failed to re-encode PNG after EXIF strip, using original");
                data.to_vec()
            }
        }
        Err(_) => {
            warn!("Failed to parse PNG for EXIF stripping, using original");
            data.to_vec()
        }
    }
}

/// POST /api/upload — upload a file (authenticated users only).
/// Automatically strips EXIF metadata from JPEG/PNG uploads.
/// Returns the public URL for the uploaded file.
pub async fn upload_file(
    _state: State<AppState>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> Result<Json<Value>, AppError> {
    // Ensure upload directory exists.
    tokio::fs::create_dir_all(UPLOAD_DIR)
        .await
        .map_err(|e| AppError::Internal(format!("Cannot create upload dir: {}", e)))?;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(format!("Multipart error: {}", e)))?
    {
        let original_name = field.file_name().unwrap_or("file").to_string();
        let content_type = field.content_type().unwrap_or("application/octet-stream").to_string();

        // Validate content type.
        let allowed = [
            "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
        ];
        if !allowed.iter().any(|a| content_type.starts_with(a)) {
            return Err(AppError::BadRequest(format!(
                "File type '{}' not allowed. Allowed: png, jpg, gif, webp, svg",
                content_type
            )));
        }

        let data = field.bytes()
            .await
            .map_err(|e| AppError::BadRequest(format!("Read error: {}", e)))?;

        if data.len() > MAX_FILE_SIZE {
            return Err(AppError::BadRequest("File too large (max 10 MB)".into()));
        }

        // Strip EXIF/metadata from supported image types.
        let clean_data = match content_type.as_str() {
            "image/jpeg" => strip_exif_jpeg(&data),
            "image/png" => strip_exif_png(&data),
            // GIF, WebP, SVG: pass through as-is
            _ => data.to_vec(),
        };

        // Generate unique filename.
        let ext = extension_from_content_type(&content_type)
            .or_else(|| extension_from_name(&original_name))
            .unwrap_or("bin");
        let unique_name = format!("{}_{}.{}", chrono::Utc::now().format("%Y%m%d%H%M%S"), uuid::Uuid::new_v4().simple(), ext);
        let file_path = format!("{}/{}", UPLOAD_DIR, unique_name);

        tokio::fs::write(&file_path, &clean_data)
            .await
            .map_err(|e| AppError::Internal(format!("Write error: {}", e)))?;

        let url = format!("/api/uploads/{}", unique_name);
        info!(
            "File uploaded: {} ({} -> {} bytes, exif_stripped={}) -> {}",
            original_name, data.len(), clean_data.len(),
            clean_data.len() != data.len(), url
        );

        return Ok(Json(json!({
            "url": url,
            "filename": unique_name,
            "original_name": original_name,
            "size": clean_data.len(),
            "content_type": content_type,
            "exif_stripped": clean_data.len() != data.len(),
        })));
    }

    Err(AppError::BadRequest("No file provided".into()))
}

/// GET /api/uploads/:filename — serve an uploaded file.
pub async fn serve_upload(
    axum::extract::Path(filename): axum::extract::Path<String>,
) -> Result<axum::response::Response, AppError> {
    use axum::http::header;
    use axum::response::IntoResponse;

    // Sanitize filename to prevent path traversal.
    if filename.contains("..") || filename.contains('/') || filename.contains('\\') {
        return Err(AppError::BadRequest("Invalid filename".into()));
    }

    let path = format!("{}/{}", UPLOAD_DIR, filename);
    let data = tokio::fs::read(&path)
        .await
        .map_err(|_| AppError::NotFound("File not found".into()))?;

    let content_type = if filename.ends_with(".png") {
        "image/png"
    } else if filename.ends_with(".jpg") || filename.ends_with(".jpeg") {
        "image/jpeg"
    } else if filename.ends_with(".gif") {
        "image/gif"
    } else if filename.ends_with(".webp") {
        "image/webp"
    } else if filename.ends_with(".svg") {
        "image/svg+xml"
    } else {
        "application/octet-stream"
    };

    Ok((
        [
            (header::CONTENT_TYPE, content_type),
            (header::CACHE_CONTROL, "public, max-age=31536000, immutable"),
        ],
        data,
    ).into_response())
}

fn extension_from_content_type(ct: &str) -> Option<&str> {
    match ct {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        "image/svg+xml" => Some("svg"),
        _ => None,
    }
}

fn extension_from_name(name: &str) -> Option<&str> {
    name.rsplit('.').next().and_then(|ext| match ext {
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" => Some(ext),
        _ => None,
    })
}
