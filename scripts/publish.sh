#!/usr/bin/env bash
# ╔════════════════════════════════════════════════════════════╗
# ║  fs0ciety — Blog Post Publisher                           ║
# ║                                                           ║
# ║  Reads .mdx files with YAML frontmatter and pushes them   ║
# ║  to the fs0ciety API (create or update).                  ║
# ║                                                           ║
# ║  Usage:                                                   ║
# ║    ./scripts/publish.sh <file.mdx>                        ║
# ║    ./scripts/publish.sh content/posts/*.mdx               ║
# ║    ./scripts/publish.sh --list                            ║
# ║    ./scripts/publish.sh --delete <slug>                   ║
# ║                                                           ║
# ║  Auth (pick one):                                         ║
# ║    export FS0CIETY_API_KEY="your-admin-api-key"           ║
# ║    export FS0CIETY_TOKEN="your-jwt-token"                 ║
# ║                                                           ║
# ║  Env:                                                     ║
# ║    FS0CIETY_URL  (default: https://fs0ciety.org)          ║
# ╚════════════════════════════════════════════════════════════╝
set -euo pipefail

BASE_URL="${FS0CIETY_URL:-https://fs0ciety.org}"
TOKEN="${FS0CIETY_API_KEY:-${FS0CIETY_TOKEN:-}}"

if [ -z "$TOKEN" ]; then
  echo "Error: Set FS0CIETY_API_KEY or FS0CIETY_TOKEN"
  exit 1
fi

AUTH="Authorization: Bearer $TOKEN"

# ── Helpers ───────────────────────────────────────────────
json_escape() {
  python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$1"
}

# Parse YAML-ish frontmatter from an MDX file.
# Expects: --- at line 1, then key: value pairs, then --- to close.
parse_frontmatter() {
  local file="$1"
  local in_fm=0
  local line_num=0

  FM_TITLE="" FM_SLUG="" FM_TAGS="" FM_PUBLISHED="false" FM_AUTHOR=""

  while IFS= read -r line; do
    line_num=$((line_num + 1))
    if [ "$line_num" -eq 1 ] && [ "$line" = "---" ]; then
      in_fm=1; continue
    fi
    if [ "$in_fm" -eq 1 ] && [ "$line" = "---" ]; then
      break
    fi
    if [ "$in_fm" -eq 1 ]; then
      local key val
      key=$(echo "$line" | sed -n 's/^\([a-zA-Z_]*\):.*/\1/p')
      val=$(echo "$line" | sed -n 's/^[a-zA-Z_]*: *//p')
      case "$key" in
        title)     FM_TITLE="$val" ;;
        slug)      FM_SLUG="$val" ;;
        tags)      FM_TAGS="$val" ;;
        published) FM_PUBLISHED="$val" ;;
        author)    FM_AUTHOR="$val" ;;
      esac
    fi
  done < "$file"
}

# Extract content after frontmatter.
get_content() {
  local file="$1"
  # Skip everything up to and including the second "---"
  awk 'BEGIN{c=0} /^---$/{c++;next} c>=2{print}' "$file"
}

# Convert comma-separated or bracket tags to JSON array.
tags_to_json() {
  local raw="$1"
  # Strip brackets if present: [tag1, tag2] -> tag1, tag2
  raw="${raw#[}"
  raw="${raw%]}"
  # Split by comma and build JSON array.
  python3 -c "
import json, sys
raw = sys.argv[1]
tags = [t.strip().strip('\"').strip(\"'\") for t in raw.split(',') if t.strip()]
print(json.dumps(tags))
" "$raw"
}

# ── Commands ──────────────────────────────────────────────
cmd_list() {
  echo "Fetching posts from $BASE_URL..."
  curl -sS -H "$AUTH" "$BASE_URL/api/admin/posts" | python3 -m json.tool
}

cmd_delete() {
  local slug="$1"
  echo "Deleting post: $slug"
  curl -sS -X DELETE -H "$AUTH" "$BASE_URL/api/admin/posts/$slug" | python3 -m json.tool
}

cmd_publish() {
  local file="$1"

  if [ ! -f "$file" ]; then
    echo "Error: File not found: $file"
    return 1
  fi

  echo "── Publishing: $file"

  # Parse frontmatter.
  parse_frontmatter "$file"

  if [ -z "$FM_TITLE" ] || [ -z "$FM_SLUG" ]; then
    echo "  Error: frontmatter must include 'title' and 'slug'"
    return 1
  fi

  local content
  content=$(get_content "$file")

  local tags_json
  tags_json=$(tags_to_json "${FM_TAGS:-}")

  local published="false"
  if [ "$FM_PUBLISHED" = "true" ]; then published="true"; fi

  local content_escaped
  content_escaped=$(json_escape "$content")

  local title_escaped
  title_escaped=$(json_escape "$FM_TITLE")

  local payload
  payload=$(cat <<ENDJSON
{
  "title": $title_escaped,
  "slug": "$FM_SLUG",
  "content": $content_escaped,
  "tags": $tags_json,
  "published": $published
}
ENDJSON
)

  # Try to update first (PUT). If 404, create (POST).
  local http_code
  http_code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X PUT \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$BASE_URL/api/admin/posts/$FM_SLUG")

  if [ "$http_code" = "200" ]; then
    echo "  Updated: $FM_SLUG"
  elif [ "$http_code" = "404" ]; then
    # Create new post.
    http_code=$(curl -sS -o /dev/null -w "%{http_code}" \
      -X POST \
      -H "$AUTH" \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$BASE_URL/api/admin/posts")

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
      echo "  Created: $FM_SLUG"
    else
      echo "  Error creating post (HTTP $http_code)"
      return 1
    fi
  else
    echo "  Error updating post (HTTP $http_code)"
    return 1
  fi

  echo "  → ${BASE_URL}/blog/$FM_SLUG"
}

# ── Main ──────────────────────────────────────────────────
if [ $# -eq 0 ]; then
  echo "Usage:"
  echo "  $0 <file.mdx> [file2.mdx ...]  — Publish MDX files"
  echo "  $0 --list                       — List all posts"
  echo "  $0 --delete <slug>              — Delete a post"
  echo ""
  echo "Env vars:"
  echo "  FS0CIETY_API_KEY  — Admin API key (recommended)"
  echo "  FS0CIETY_TOKEN    — JWT token (alternative)"
  echo "  FS0CIETY_URL      — Base URL (default: https://fs0ciety.org)"
  exit 0
fi

case "$1" in
  --list)
    cmd_list
    ;;
  --delete)
    [ -z "${2:-}" ] && echo "Usage: $0 --delete <slug>" && exit 1
    cmd_delete "$2"
    ;;
  *)
    for file in "$@"; do
      cmd_publish "$file"
    done
    ;;
esac
