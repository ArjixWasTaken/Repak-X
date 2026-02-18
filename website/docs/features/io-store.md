---
sidebar_position: 5
---

# IO Store Support

Repak X fully supports Unreal Engine's IO Store format alongside Legacy PAK files.

## What is IO Store?

IO Store (`.utoc` / `.ucas`) is Unreal Engine's modern asset packaging format, offering better performance and loading times compared to Legacy PAK files.

## Legacy PAK vs IO Store

| Feature | Legacy PAK | IO Store |
|---------|-----------|----------|
| Format | `.pak` | `.utoc` / `.ucas` |
| Compression | Optional | Oodle (recommended) |
| Performance | Standard | Optimized |

## Oodle Compression

IO Store bundles can be compressed with Oodle compression to reduce file size while maintaining fast load times.
