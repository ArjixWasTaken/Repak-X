using System;
using System.Collections.Generic;
using System.IO;
using UAssetAPI.PropertyTypes.Objects;
using UAssetAPI.UnrealTypes;

namespace UAssetAPI.ExportTypes.Texture
{
    /// <summary>
    /// Export type for UTexture2D and related texture classes.
    /// Properly parses FTexturePlatformData instead of storing it in Extras.
    /// Based on CUE4Parse's UTexture2D implementation.
    /// </summary>
    public class TextureExport : NormalExport
    {
        /// <summary>
        /// The parsed texture platform data containing mipmaps.
        /// </summary>
        public FTexturePlatformData PlatformData;

        /// <summary>
        /// Path to external .ubulk file if present.
        /// </summary>
        public string BulkFilePath;

        /// <summary>
        /// Whether this is a 2D texture (vs cube map, volume, etc.)
        /// </summary>
        public bool IsTexture2D = true;

        /// <summary>
        /// Strip data flags read from the texture.
        /// </summary>
        public byte StripDataFlags1;
        public byte StripDataFlags2;

        /// <summary>
        /// Whether the texture is cooked.
        /// </summary>
        public bool bCooked;

        /// <summary>
        /// Whether to serialize mip data (UE5.3+).
        /// </summary>
        public bool bSerializeMipData = true;

        /// <summary>
        /// Pixel format name ID (raw uint64, not FName).
        /// </summary>
        public ulong PixelFormatNameId;

        /// <summary>
        /// Skip offset for cooked platform data.
        /// </summary>
        public long SkipOffset;

        /// <summary>
        /// Position where skip offset was written (for updating on write).
        /// </summary>
        private long _skipOffsetPosition;

        /// <summary>
        /// Strip data flags 3 (UTexture2D GlobalStripFlags).
        /// </summary>
        public byte StripDataFlags3;

        /// <summary>
        /// Strip data flags 4 (UTexture2D ClassStripFlags).
        /// </summary>
        public byte StripDataFlags4;

        /// <summary>
        /// Unknown uint32 for UE4.20+.
        /// </summary>
        public uint UnknownUint32;

        /// <summary>
        /// Placeholder bytes for UE5.0+ (16 bytes).
        /// </summary>
        public byte[] PlaceholderBytes;

        /// <summary>
        /// Raw bytes before FTexturePlatformData (for round-trip serialization).
        /// </summary>
        private byte[] _preDataBytes;

        public TextureExport(Export super) : base(super)
        {
        }

        public TextureExport(UAsset asset, byte[] extras) : base(asset, extras)
        {
        }

        public TextureExport() : base()
        {
        }

        public override void Read(AssetBinaryReader reader, int nextStarting = 0)
        {
            // First read the normal export data (properties)
            base.Read(reader, nextStarting);

            // Determine bulk file path
            if (Asset is UAsset uasset && !string.IsNullOrEmpty(uasset.FilePath))
            {
                BulkFilePath = Path.ChangeExtension(uasset.FilePath, ".ubulk");
            }

            long remainingBytes = nextStarting - reader.BaseStream.Position;
            if (remainingBytes <= 0)
            {
                return;
            }

            // Texture parsing for UE5.3+ (Marvel Rivals format)
            // Based on CUE4Parse's UTexture2D implementation
            // DISABLED: The bulk data header structure is complex and version-dependent.
            // The Python UE4-DDS-Tools handles this correctly with extensive version-specific logic.
            // Key findings from debugging:
            // - Strip flags: 4 bytes (2 from UTexture + 2 from UTexture2D)
            // - bCooked: int32 (not bool)
            // - bSerializeMipData: int32 for UE5.3+
            // - PixelFormatName: FName (8 bytes)
            // - SkipOffset: int64 relative offset
            // - FTexturePlatformData: 16-byte placeholder + SizeX/SizeY/PackedData + FString PixelFormat + mips
            // - FByteBulkDataHeader: flags(4) + count(4) + size(4) + offset(8) = 20 bytes minimum
            // - Bulk data can be inline or in .ubulk file based on flags and offset
            bool enableTextureParsing = true;
            if (!enableTextureParsing)
            {
                Extras = reader.ReadBytes((int)remainingBytes);
                return;
            }

            try
            {
                long startPos = reader.BaseStream.Position;
                
                // UTexture::Deserialize reads FStripDataFlags (2 bytes)
                // UTexture2D::Deserialize reads another FStripDataFlags (2 bytes)
                // Total: 4 bytes of strip flags
                StripDataFlags1 = reader.ReadByte(); // UTexture GlobalStripFlags
                StripDataFlags2 = reader.ReadByte(); // UTexture ClassStripFlags
                StripDataFlags3 = reader.ReadByte(); // UTexture2D GlobalStripFlags
                StripDataFlags4 = reader.ReadByte(); // UTexture2D ClassStripFlags

                // bCooked (int32 as bool) - Unreal serializes bool as int32 in cooked packages
                bCooked = reader.ReadInt32() != 0;

                if (bCooked)
                {
                    // UE5.3+: bSerializeMipData (int32 as bool)
                    bSerializeMipData = reader.ReadInt32() != 0;

                    // DeserializeCookedPlatformData (CUE4Parse approach)
                    // Read pixel format name as FName
                    var pixelFormatName = reader.ReadFName();
                    string pixelFormatStr = pixelFormatName?.Value?.Value ?? "null";
                    
                    // Loop while pixelFormatName is not None (CUE4Parse reads multiple formats)
                    while (pixelFormatName != null && pixelFormatName.Value?.Value != "None")
                    {
                        // Skip offset (int64 for UE5.0+) - relative from AFTER reading the offset
                        _skipOffsetPosition = reader.BaseStream.Position;
                        long skipOffsetRel = reader.ReadInt64();
                        SkipOffset = reader.BaseStream.Position + skipOffsetRel;

                        // Try to read FTexturePlatformData
                        try
                        {
                            PlatformData = new FTexturePlatformData(reader, BulkFilePath, bSerializeMipData, true);
                        }
                        catch (Exception ex)
                        {
                            Console.Error.WriteLine($"[TextureExport] FTexturePlatformData parsing failed: {ex.Message}");
                            // Use skip offset to continue
                            reader.BaseStream.Position = SkipOffset;
                            PlatformData = null;
                        }

                        // Ensure we're at the skip offset position
                        if (reader.BaseStream.Position != SkipOffset)
                        {
                            reader.BaseStream.Position = SkipOffset;
                        }

                        // Read next pixel format name
                        if (reader.BaseStream.Position < nextStarting - 8)
                        {
                            pixelFormatName = reader.ReadFName();
                        }
                        else
                        {
                            break;
                        }
                    }

                    // If parsing failed, store remaining data in Extras for fallback
                    if (PlatformData == null || PlatformData.Mips == null || PlatformData.Mips.Count == 0)
                    {
                        reader.BaseStream.Position = startPos;
                        Extras = reader.ReadBytes((int)remainingBytes);
                    }
                    else
                    {
                        Extras = Array.Empty<byte>();
                    }
                }
                else
                {
                    // Not cooked - read remaining as Extras
                    reader.BaseStream.Position = startPos;
                    Extras = reader.ReadBytes((int)remainingBytes);
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[TextureExport] Failed to parse texture data: {ex.Message}");
                Console.Error.WriteLine($"[TextureExport] Stack: {ex.StackTrace}");
                
                // On failure, try to read remaining as Extras
                long remaining = nextStarting - reader.BaseStream.Position;
                if (remaining > 0)
                {
                    Extras = reader.ReadBytes((int)remaining);
                }
            }
        }

        public override void Write(AssetBinaryWriter writer)
        {
            // Write the normal export data (properties)
            base.Write(writer);

            // If we have parsed platform data, write the full texture structure
            if (PlatformData != null)
            {
                // Write strip data flags (4 bytes total: 2 from UTexture + 2 from UTexture2D)
                writer.Write(StripDataFlags1);
                writer.Write(StripDataFlags2);
                writer.Write(StripDataFlags3);
                writer.Write(StripDataFlags4);

                // Write bCooked
                writer.Write(bCooked ? 1 : 0);

                if (bCooked)
                {
                    // UE5.3+: bSerializeMipData
                    if (writer.Asset.ObjectVersionUE5 >= ObjectVersionUE5.LARGE_WORLD_COORDINATES)
                    {
                        writer.Write(bSerializeMipData ? 1 : 0);
                    }

                    // Write pixel format name ID
                    writer.Write(PixelFormatNameId);

                    // Write skip offset placeholder - we'll update it later
                    // UE5.0+: skip offset is int64 (8 bytes), not uint32
                    long skipOffsetPos = writer.BaseStream.Position;
                    writer.Write((long)0); // Placeholder for skip offset (int64 for UE5)

                    // UE4.20+: unknown uint32
                    if (writer.Asset.GetCustomVersion<FRenderingObjectVersion>() >= FRenderingObjectVersion.TextureSourceArtRefactor)
                    {
                        writer.Write(UnknownUint32);
                    }

                    // UE5.0+: placeholder (16 bytes)
                    if (writer.Asset.ObjectVersionUE5 >= ObjectVersionUE5.INITIAL_VERSION)
                    {
                        writer.Write(PlaceholderBytes ?? new byte[16]);
                    }

                    // Write FTexturePlatformData
                    PlatformData.Write(writer);

                    // Update skip offset (int64 for UE5)
                    long currentPos = writer.BaseStream.Position;
                    writer.BaseStream.Position = skipOffsetPos;
                    writer.Write((long)(currentPos - skipOffsetPos - 8)); // Relative offset from AFTER the skip offset field
                    writer.BaseStream.Position = currentPos;
                }
            }
            else if (Extras != null && Extras.Length > 0)
            {
                // Fall back to writing Extras if we don't have parsed platform data
                writer.Write(Extras);
            }
        }

        /// <summary>
        /// Strip all mipmaps except the first one and convert to inline storage.
        /// This eliminates the need for .ubulk files.
        /// </summary>
        /// <returns>True if mipmaps were stripped, false if not a texture or already had 1 mipmap.</returns>
        public bool StripMipmaps()
        {
            if (PlatformData == null)
            {
                return false;
            }

            return PlatformData.StripMipmaps();
        }

        /// <summary>
        /// Get the number of mipmaps in this texture.
        /// </summary>
        public int MipCount => PlatformData?.Mips?.Count ?? 0;

        /// <summary>
        /// Get the pixel format of this texture.
        /// </summary>
        public string PixelFormat => PlatformData?.PixelFormat ?? string.Empty;

        /// <summary>
        /// Get the texture dimensions.
        /// </summary>
        public (int Width, int Height) Dimensions => (PlatformData?.SizeX ?? 0, PlatformData?.SizeY ?? 0);

        /// <summary>
        /// Check if this texture has external bulk data (.ubulk file).
        /// </summary>
        public bool HasExternalBulkData
        {
            get
            {
                if (PlatformData?.Mips == null) return false;
                foreach (var mip in PlatformData.Mips)
                {
                    if (mip.BulkData?.Header?.IsInSeparateFile == true)
                    {
                        return true;
                    }
                }
                return false;
            }
        }
    }
}
