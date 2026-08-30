---
name: make-images-transparent
description: Create, extract, validate, or repair genuine alpha transparency in raster images. Use for transparent backgrounds, RGBA PNG/WebP cutouts, background removal, or problems such as baked checkerboards, opaque enclosed gaps, matte halos, color spill, jagged edges, and lost watercolor, ink, fur, hair, or other soft detail.
---

# Make Images Transparent

Produce a real alpha-bearing PNG or WebP. Never treat a drawn checkerboard as transparency, and never trust a preview without checking the file.

## Workflow

1. Determine whether the input already has usable alpha:

   ```bash
   bash scripts/validate_alpha.sh INPUT.png --preview-dir PREVIEWS
   ```

   If validation and both previews look clean, do not rematte it.

2. For new output from `codex_generate_image` or another tool without a native transparency control, request a perfectly flat saturated chroma background with no shadows, gradients, texture, reflections, or floor plane. Choose a key color absent from the artwork; magenta is usually safest for naturalistic artwork with green accents.

3. Select the least destructive extraction route:

   - **Single uniform or chroma background:** use `scripts/soft_matte.sh`.
   - **Baked checkerboard, pale subject against a similar background, or a matte that removes legitimate pale detail:** use the two-source chroma workflow.
   - **Already-valid alpha with a local defect:** prefer a targeted image edit or mask instead of rematting the whole image.
   - **Scenery, complex gradients, or no usable key color:** use a segmentation-capable editor. Do not force color-key extraction.

4. Validate the result and inspect it over contrasting backgrounds. Check fur and brush tips, pale washes, enclosed gaps between limbs and props, handles, and the ground edge.

5. Keep the source files and save the corrected result non-destructively unless replacement was explicitly requested.

## Single-source soft matte

Use for a flat or gently varying background. The script samples corner patches unless `--background` is supplied, creates soft alpha globally rather than by flood fill, clears enclosed background gaps, and unmattes partially transparent RGB edges.

```bash
bash scripts/soft_matte.sh INPUT.png OUTPUT.png \
  --background '#ff00ff' --low 0.012 --high 0.35 \
  --preview-dir PREVIEWS
```

Adjustment guidance:

- Raise `--high` toward `0.45` when halos remain.
- Lower `--high` toward `0.25` when legitimate pale or translucent detail fades.
- Raise `--low` slightly when faint background texture remains.
- Lower `--low` when very pale intentional washes disappear.
- Supply `--background` when the subject touches a corner or corner sampling is unreliable.

## Two-source chroma transfer

Use when direct removal damages pale detail or when the source contains a baked checkerboard.

1. Create a clean RGB master on one uniform neutral background. Preserve the subject, dimensions, composition, splatters, and edge detail.
2. Make a background-only edit from that master, replacing only the background with a saturated key color absent from the subject. Do not request transparency.
3. Confirm that both files have identical dimensions and that the subject has not shifted, changed, or been redrawn. The script checks dimensions, not visual registration. Reject a misregistered pair.
4. Derive alpha from the chroma image and apply it to the clean master:

   ```bash
   bash scripts/chroma_alpha_transfer.sh CLEAN.png CHROMA.png OUTPUT.png \
     --key magenta --preview-dir PREVIEWS
   ```

The output uses un-matted RGB from the clean master, not RGB from the chroma image. This prevents key-color fringe while preserving pale neutral subject pixels.

Adjustment guidance:

- Lower `--opaque-at` if faint key background remains.
- Raise `--opaque-at` if legitimate subject pixels become translucent.
- Adjust `--transparent-at` to broaden or narrow the partially transparent edge while keeping it above `--opaque-at`.
- Pass `--clean-background COLOR` if clean-master corner sampling is unreliable.

## Quality gate

Require all of the following:

- An alpha-bearing channel such as `srgba`.
- Alpha minimum `0` and maximum above `0`.
- Transparent exterior and enclosed background gaps.
- Soft partial alpha on antialiasing, watercolor, dry brush, fur, and hair.
- No checkerboard pixels, key-color spill, pale matte halo, jagged cutout edge, redraw, crop, sharpening, or composition shift.
- Clean appearance over both dark and light preview backgrounds.
