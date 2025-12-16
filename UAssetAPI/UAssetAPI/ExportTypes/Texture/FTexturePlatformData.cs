using System;
using System.Collections.Generic;
using UAssetAPI.UnrealTypes;

namespace UAssetAPI.ExportTypes.Texture
{
    /// <summary>
    /// Texture platform data containing mipmaps and format information.
    /// Ported from CUE4Parse with write support added.
    /// </summary>
    public class FTexturePlatformData
    {
        private const uint BitMask_CubeMap = 1u << 31;
        private const uint BitMask_HasOptData = 1u << 30;
        private const uint BitMask_HasCpuCopy = 1u << 29;
        private const uint BitMask_NumSlices = BitMask_HasOptData - 1u;

        public int SizeX;
        public int SizeY;
        public uint PackedData;
        public string PixelFormat;
        public FOptTexturePlatformData OptData;
        public int FirstMipToSerialize;
        public List<FTexture2DMipMap> Mips;

        /// <summary>
        /// Path to external .ubulk file for loading mipmap data.
        /// </summary>
        public string BulkFilePath;

        public FTexturePlatformData()
        {
            SizeX = 0;
            SizeY = 0;
            PackedData = 1; // Default to 1 slice
            PixelFormat = string.Empty;
            OptData = new FOptTexturePlatformData();
            FirstMipToSerialize = 0;
            Mips = new List<FTexture2DMipMap>();
        }

        public FTexturePlatformData(AssetBinaryReader reader, string bulkFilePath = null, bool bSerializeMipData = true, bool isUE5Cooked = false)
        {
            BulkFilePath = bulkFilePath;
            Read(reader, bSerializeMipData, isUE5Cooked);
        }

        public void Read(AssetBinaryReader reader, bool bSerializeMipData = true, bool isUE5Cooked = false)
        {
            // FTexturePlatformData::SerializeCooked (CUE4Parse approach)
            // For UE5.0+ cooked assets with IsFilterEditorOnly, skip 16 bytes placeholder
            if (isUE5Cooked)
            {
                reader.BaseStream.Position += 16; // PlaceholderDerivedDataSize
            }
            
            // Read dimensions and packed data
            SizeX = reader.ReadInt32();
            SizeY = reader.ReadInt32();
            PackedData = reader.ReadUInt32();

            // Read pixel format as FString (CUE4Parse: Ar.ReadFString())
            PixelFormat = reader.ReadFString()?.Value ?? string.Empty;

            // Optional texture platform data (if HasOptData flag is set in PackedData)
            if (HasOptData())
            {
                OptData = new FOptTexturePlatformData();
                OptData.ExtData = reader.ReadUInt32();
                OptData.NumMipsInTail = reader.ReadUInt32();
            }

            // First mip to serialize (cooked assets only)
            FirstMipToSerialize = reader.ReadInt32();

            // Read mipmap count and mipmaps
            int mipCount = reader.ReadInt32();
            
            if (mipCount < 0 || mipCount > 20)
            {
                throw new InvalidOperationException($"Invalid mip count: {mipCount}. Parsing error at position {reader.BaseStream.Position}");
            }
            
            Mips = new List<FTexture2DMipMap>(mipCount);

            for (int i = 0; i < mipCount; i++)
            {
                var mip = new FTexture2DMipMap(reader, BulkFilePath, bSerializeMipData);
                Mips.Add(mip);
            }

            // Update dimensions from first mip if available (CUE4Parse does this)
            if (Mips.Count > 0)
            {
                SizeX = Mips[0].SizeX;
                SizeY = Mips[0].SizeY;
            }
        }

        public void Write(AssetBinaryWriter writer)
        {
            // Write dimensions and packed data
            // Use mip dimensions if available (they're more reliable after stripping)
            int writeX = Mips.Count > 0 ? Mips[0].SizeX : SizeX;
            int writeY = Mips.Count > 0 ? Mips[0].SizeY : SizeY;
            writer.Write(writeX);
            writer.Write(writeY);
            writer.Write(PackedData);

            // Write pixel format
            writer.Write(new FString(PixelFormat));

            // Optional texture platform data
            if (HasOptData())
            {
                writer.Write(OptData.ExtData);
                writer.Write(OptData.NumMipsInTail);
            }

            // First mip to serialize
            writer.Write(FirstMipToSerialize);

            // Write mipmap count and mipmaps
            writer.Write(Mips.Count);
            foreach (var mip in Mips)
            {
                mip.Write(writer);
            }

            // bIsVirtual (UE4.23+) - always 0 for non-virtual textures
            writer.Write((int)0);

            // none_name_id (UE5+) - FName "None" as uint64
            // This is written after bIsVirtual in UE5 textures
            // FName is typically index (4 bytes) + number (4 bytes)
            // "None" is usually index 0 with number 0, but some assets use index 4
            writer.Write((int)4); // FName index (4 = "None" in some name tables)
            writer.Write((int)0); // FName number
        }

        public bool HasCpuCopy() => (PackedData & BitMask_HasCpuCopy) == BitMask_HasCpuCopy;
        public bool HasOptData() => (PackedData & BitMask_HasOptData) == BitMask_HasOptData;
        public bool IsCubemap() => (PackedData & BitMask_CubeMap) == BitMask_CubeMap;
        public int GetNumSlices() => (int)(PackedData & BitMask_NumSlices);

        /// <summary>
        /// Strip all mipmaps except the first one and convert to inline storage.
        /// This is used for texture mods to eliminate .ubulk dependencies.
        /// </summary>
        /// <returns>True if mipmaps were stripped, false if already had 1 or 0 mipmaps.</returns>
        public bool StripMipmaps()
        {
            if (Mips.Count <= 1)
            {
                return false;
            }

            // Keep only the first (largest) mipmap
            var firstMip = Mips[0];
            
            // Convert to inline storage
            firstMip.ConvertToInline();

            // Clear the mip list and add only the first mip
            Mips.Clear();
            Mips.Add(firstMip);

            // Update FirstMipToSerialize - should be 0 for single mip textures
            // (matches UE-cooked NoMipMaps textures)
            FirstMipToSerialize = 0;

            return true;
        }

        /// <summary>
        /// Get total size of all mipmap data.
        /// </summary>
        public long GetTotalMipDataSize()
        {
            long total = 0;
            foreach (var mip in Mips)
            {
                total += mip.BulkData?.Data?.Length ?? 0;
            }
            return total;
        }
    }

    /// <summary>
    /// Optional texture platform data for UE5+.
    /// </summary>
    public struct FOptTexturePlatformData
    {
        public uint ExtData;
        public uint NumMipsInTail;
    }
}
