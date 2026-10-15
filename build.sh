#!/bin/sh
# Builds two files from src/:
#   dist/artifact.html  page body only (what the claude.ai Artifact publishes; it adds its own <head>)
#   dist/index.html     standalone page you can open locally or host anywhere
set -e
cd "$(dirname "$0")"
mkdir -p dist
{ cat src/page.html; printf '\n<script>\n'; cat src/js/*.js; printf '\n</script>\n'; } > dist/artifact.html
{ printf '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}body{margin:0}img{max-width:100%%}[hidden]{display:none!important}</style></head><body>\n'
  cat dist/artifact.html; printf '</body></html>\n'; } > dist/index.html
node -e "const s=require('fs').readFileSync('dist/artifact.html','utf8');new Function(s.split('<script>')[1].split('</script>')[0]);" && echo "built dist/ (syntax ok)"
