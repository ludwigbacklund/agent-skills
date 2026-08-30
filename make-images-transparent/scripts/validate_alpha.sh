#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: validate_alpha.sh INPUT [--preview-dir DIR]' \
    '' \
    'Validates that INPUT has useful alpha and optionally renders dark/light previews.'
}

if [[ $# -lt 1 ]]; then
  usage >&2
  exit 2
fi

input=$1
shift
preview_dir=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --preview-dir)
      preview_dir=${2:?missing value for --preview-dir}
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      printf 'Unknown argument: %s\n' "$1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if command -v magick >/dev/null; then
  im() { magick "$@"; }
  identify_image() { magick identify "$@"; }
elif command -v convert >/dev/null && command -v identify >/dev/null; then
  im() { convert "$@"; }
  identify_image() { identify "$@"; }
else
  printf 'ImageMagick 6 or 7 is required.\n' >&2
  exit 1
fi

[[ -f "$input" ]] || { printf 'Input not found: %s\n' "$input" >&2; exit 1; }

metadata=$(identify_image -format '%m|%[channels]|%w|%h' "$input")
IFS='|' read -r format channels width height <<< "$metadata"
case "$channels" in
  *a*) ;;
  *) printf 'Validation failed: %s has no alpha channel (%s).\n' "$input" "$channels" >&2; exit 1 ;;
esac

read -r alpha_min alpha_max alpha_mean < <(
  im "$input" -alpha extract -format '%[min] %[max] %[fx:mean]\n' info:
)
if [[ "$alpha_min" != '0' ]]; then
  printf 'Validation failed: alpha never reaches full transparency (minimum %s).\n' "$alpha_min" >&2
  exit 1
fi
if [[ "$alpha_max" == '0' ]]; then
  printf 'Validation failed: image is fully transparent.\n' >&2
  exit 1
fi

if [[ -n "$preview_dir" ]]; then
  mkdir -p "$preview_dir"
  im -size "${width}x${height}" xc:'#24313a' "$input" \
    -compose over -composite "$preview_dir/dark.png"
  im -size "${width}x${height}" xc:'#f8f5ee' "$input" \
    -compose over -composite "$preview_dir/light.png"
fi

printf 'Valid alpha image: %s\n' "$input"
printf 'Format: %s; channels: %s; dimensions: %sx%s\n' "$format" "$channels" "$width" "$height"
printf 'Alpha range: %s..%s; mean coverage: %s\n' "$alpha_min" "$alpha_max" "$alpha_mean"
if [[ -n "$preview_dir" ]]; then
  printf 'Previews: %s/dark.png and %s/light.png\n' "$preview_dir" "$preview_dir"
fi
