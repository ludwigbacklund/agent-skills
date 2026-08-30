#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf '%s\n' \
    'Usage: soft_matte.sh INPUT OUTPUT [--background COLOR] [--low N] [--high N] [--preview-dir DIR]' \
    '' \
    'Creates a transparent PNG from an image with a uniform or gently varying background.' \
    'Defaults: --low 0.012 --high 0.35; background sampled from four corner patches.'
}

if [[ $# -lt 2 ]]; then
  usage >&2
  exit 2
fi

input=$1
output=$2
shift 2
background=''
low='0.012'
high='0.35'
preview_dir=''

while [[ $# -gt 0 ]]; do
  case "$1" in
    --background)
      background=${2:?missing value for --background}
      shift 2
      ;;
    --low)
      low=${2:?missing value for --low}
      shift 2
      ;;
    --high)
      high=${2:?missing value for --high}
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

if ! awk -v low="$low" -v high="$high" \
  'BEGIN { exit !(low >= 0 && high > low && high <= 2) }'; then
  printf 'Thresholds must satisfy 0 <= --low < --high <= 2.\n' >&2
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

[[ -f "$input" ]] || { printf 'Input not found: %s\n' "$input" >&2; exit 1; }
read -r width height < <(identify_image -format '%w %h\n' "$input")
patch=32
if (( width < 64 || height < 64 )); then
  patch=8
fi
right=$((width - patch))
bottom=$((height - patch))

if [[ -n "$background" ]]; then
  read -r bg_r bg_g bg_b < <(
    im -size 1x1 "xc:$background" -format '%[fx:r] %[fx:g] %[fx:b]\n' info:
  )
else
  read -r bg_r bg_g bg_b < <(
    im \
      \( "$input" -crop "${patch}x${patch}+0+0" +repage \) \
      \( "$input" -crop "${patch}x${patch}+${right}+0" +repage \) \
      \( "$input" -crop "${patch}x${patch}+0+${bottom}" +repage \) \
      \( "$input" -crop "${patch}x${patch}+${right}+${bottom}" +repage \) \
      +append -scale '1x1!' -format '%[fx:r] %[fx:g] %[fx:b]\n' info:
  )
fi

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT
mask="$work_dir/alpha.png"

im "$input" -alpha off \
  -fx "max(0,min(1,(sqrt((r-$bg_r)^2+(g-$bg_g)^2+(b-$bg_b)^2)-$low)/($high-$low)))" \
  "$mask"

for channel in r g b; do
  case "$channel" in
    r) bg=$bg_r; image_channel=R ;;
    g) bg=$bg_g; image_channel=G ;;
    b) bg=$bg_b; image_channel=B ;;
  esac
  im "$input" -alpha off -channel "$image_channel" -separate "$mask" \
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
printf 'Sampled background RGB: %s %s %s\n' "$bg_r" "$bg_g" "$bg_b"
