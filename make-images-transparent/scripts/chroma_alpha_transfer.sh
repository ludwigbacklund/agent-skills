#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: chroma_alpha_transfer.sh CLEAN CHROMA OUTPUT [--key magenta|green|blue|red|cyan|yellow] [--opaque-at N] [--transparent-at N] [--clean-background COLOR] [--preview-dir DIR]' \
    '' \
    'Derives alpha from a registered chroma image and applies un-matted RGB from the clean master.' \
    'Defaults: --key magenta --opaque-at 0.15 --transparent-at 0.65.'
}

if [[ $# -lt 3 ]]; then
  usage >&2
  exit 2
fi

clean=$1
chroma=$2
output=$3
shift 3
key='magenta'
opaque_at='0.15'
transparent_at='0.65'
clean_background=''
preview_dir=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --key)
      key=${2:?missing value for --key}
      shift 2
      ;;
    --opaque-at)
      opaque_at=${2:?missing value for --opaque-at}
      shift 2
      ;;
    --transparent-at)
      transparent_at=${2:?missing value for --transparent-at}
      shift 2
      ;;
    --clean-background)
      clean_background=${2:?missing value for --clean-background}
      shift 2
      ;;
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

if ! awk -v low="$opaque_at" -v high="$transparent_at" \
  'BEGIN { exit !(low >= 0 && high <= 1 && low < high) }'; then
  printf 'Thresholds must satisfy 0 <= --opaque-at < --transparent-at <= 1.\n' >&2
  exit 2
fi

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

[[ -f "$clean" ]] || { printf 'Clean master not found: %s\n' "$clean" >&2; exit 1; }
[[ -f "$chroma" ]] || { printf 'Chroma image not found: %s\n' "$chroma" >&2; exit 1; }

read -r clean_width clean_height < <(identify_image -format '%w %h\n' "$clean")
read -r chroma_width chroma_height < <(identify_image -format '%w %h\n' "$chroma")
if [[ "$clean_width" != "$chroma_width" || "$clean_height" != "$chroma_height" ]]; then
  printf 'Images must have identical dimensions; clean=%sx%s chroma=%sx%s.\n' \
    "$clean_width" "$clean_height" "$chroma_width" "$chroma_height" >&2
  exit 1
fi

case "$key" in
  magenta) dominance='min(r,b)-g' ;;
  green) dominance='g-max(r,b)' ;;
  blue) dominance='b-max(r,g)' ;;
  red) dominance='r-max(g,b)' ;;
  cyan) dominance='min(g,b)-r' ;;
  yellow) dominance='min(r,g)-b' ;;
  *)
    printf 'Unsupported key color: %s\n' "$key" >&2
    usage >&2
    exit 2
    ;;
esac

patch=32
if (( clean_width < 64 || clean_height < 64 )); then
  patch=8
fi
right=$((clean_width - patch))
bottom=$((clean_height - patch))
if [[ -n "$clean_background" ]]; then
  read -r bg_r bg_g bg_b < <(
    im -size 1x1 "xc:$clean_background" -format '%[fx:r] %[fx:g] %[fx:b]\n' info:
  )
else
  read -r bg_r bg_g bg_b < <(
    im \
      \( "$clean" -crop "${patch}x${patch}+0+0" +repage \) \
      \( "$clean" -crop "${patch}x${patch}+${right}+0" +repage \) \
      \( "$clean" -crop "${patch}x${patch}+0+${bottom}" +repage \) \
      \( "$clean" -crop "${patch}x${patch}+${right}+${bottom}" +repage \) \
      +append -scale '1x1!' -format '%[fx:r] %[fx:g] %[fx:b]\n' info:
  )
fi

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
mask="$work_dir/alpha.png"

# Weak key dominance is subject and remains opaque. Strong dominance is background.
im "$chroma" -alpha off \
  -fx "max(0,min(1,($transparent_at-($dominance))/($transparent_at-$opaque_at)))" \
  "$mask"

# Recover foreground RGB from the clean master rather than retaining its neutral matte.
for channel in r g b; do
  case "$channel" in
    r) bg=$bg_r; image_channel=R ;;
    g) bg=$bg_g; image_channel=G ;;
    b) bg=$bg_b; image_channel=B ;;
  esac
  im "$clean" -alpha off -channel "$image_channel" -separate "$mask" \
    -fx "v<0.006?0:max(0,min(1,(u-(1-v)*$bg)/v))" \
    "$work_dir/$channel.png"
done

im "$work_dir/r.png" "$work_dir/g.png" "$work_dir/b.png" "$mask" \
  -channel RGBA -combine -colorspace sRGB PNG32:"$work_dir/output.png"

mkdir -p "$(dirname "$output")"
mv "$work_dir/output.png" "$output"

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
validation_args=()
if [[ -n "$preview_dir" ]]; then
  validation_args+=(--preview-dir "$preview_dir")
fi
bash "$script_dir/validate_alpha.sh" "$output" "${validation_args[@]}"
printf 'Key: %s; dominance thresholds: %s..%s\n' "$key" "$opaque_at" "$transparent_at"
printf 'Clean background RGB: %s %s %s\n' "$bg_r" "$bg_g" "$bg_b"
printf 'Registration must still be verified visually; matching dimensions are not proof.\n'
