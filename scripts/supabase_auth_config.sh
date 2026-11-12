#!/bin/bash
# Read/update the LINKED Supabase project's AUTH config via the Management API.
# Token is read from ~/.supabase/access-token and NEVER printed.
# Usage: supabase_auth_config.sh get | set-autoconfirm-on | set-autoconfirm-off
set -euo pipefail
REF="${SUPABASE_PROJECT_REF:-wjtroeamjamelufhxcch}"
TOKEN="$(cat "$HOME/.supabase/access-token")"
API="https://api.supabase.com/v1/projects/${REF}/config/auth"
case "${1:-get}" in
  get)
    curl -s -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" "$API" \
      | jq '{mailer_autoconfirm, external_google_enabled, external_email_enabled, mailer_secure_email_change_enabled, smtp_host, smtp_port, smtp_user, rate_limit_email_sent}'
    ;;
  set-autoconfirm-on)
    curl -s -X PATCH -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
      "$API" -d '{"mailer_autoconfirm": true}' | jq '{mailer_autoconfirm}'
    ;;
  set-autoconfirm-off)
    curl -s -X PATCH -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
      "$API" -d '{"mailer_autoconfirm": false}' | jq '{mailer_autoconfirm}'
    ;;
  *) echo "unknown action: $1" >&2; exit 2 ;;
esac
